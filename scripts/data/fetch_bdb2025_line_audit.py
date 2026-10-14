"""Retrieve only four pinned BDB2025 ZIP members using verified byte ranges.

Every decompressed member must match its previously recorded SHA256/size.
This does not claim that the entire remote archive was downloaded/verified.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import time
import urllib.request
import zlib

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out',type=Path,default=Path('data/raw/bdb2025-line-audit/big-data-bowl-data'))
parser.add_argument('--receipt',type=Path,default=Path('out/run-nfl-line-audit/acquisition.json'))
args=parser.parse_args()
start=time.perf_counter()
catalog=json.loads(Path('data/sources.json').read_text())
source=next(s for s in catalog['sources'] if s['id']=='bdb2025-2022')
pins=json.loads(Path('data/reviews/run-game-coordination/nfl-reference.json').read_text())
names=['players.csv','plays.csv','player_play.csv','tracking_week_1.csv']
expected={p['file']:p for p in pins['sources'] if p['file'] in names}
assert set(expected)==set(names)
archive_size=source['archiveBytes']
drive_id=source['sourceUrl'].split('/file/d/')[1].split('/')[0]
url=f'https://drive.usercontent.google.com/download?id={drive_id}&export=download&confirm=t'
downloaded=0
def open_range(first,last):
    r=urllib.request.urlopen(urllib.request.Request(url,headers={'Range':f'bytes={first}-{last}'}),timeout=60)
    wanted=f'bytes {first}-{last}/{archive_size}'
    if r.status!=206 or r.headers.get('Content-Range')!=wanted:
        r.close();raise RuntimeError('Server did not honor exact bounded range; refusing full archive transfer')
    return r
def read_range(first,last):
    global downloaded
    with open_range(first,last) as r:data=r.read(last-first+2)
    assert len(data)==last-first+1
    downloaded+=len(data)
    return data
tail=read_range(archive_size-65536,archive_size-1)
eocd=tail.rfind(b'PK\x05\x06');assert eocd>=0
header=struct.unpack_from('<4s4H2IH',tail,eocd)
assert header[1]==header[2]==0 and header[3]==header[4]
count,cd_size,cd_offset=header[4:7]
offset=cd_offset-(archive_size-len(tail))
directory=tail[offset:offset+cd_size] if offset>=0 else read_range(cd_offset,cd_offset+cd_size-1)
entries={};at=0
for _ in range(count):
    h=struct.unpack_from('<4s6H3I5H2I',directory,at);assert h[0]==b'PK\x01\x02'
    name=directory[at+46:at+46+h[10]].decode()
    extra=directory[at+46+h[10]:at+46+h[10]+h[11]]
    compressed,raw,local=h[8],h[9],h[16]
    p=0
    while p<len(extra):
        tag,length=struct.unpack_from('<HH',extra,p);values=extra[p+4:p+4+length];p+=4+length
        if tag==1:
            q=0
            if raw==0xffffffff:raw=struct.unpack_from('<Q',values,q)[0];q+=8
            if compressed==0xffffffff:compressed=struct.unpack_from('<Q',values,q)[0];q+=8
            if local==0xffffffff:local=struct.unpack_from('<Q',values,q)[0]
    entries[name]={'method':h[4],'flags':h[3],'crc':h[7],'compressed':compressed,'raw':raw,'local':local}
    at+=46+h[10]+h[11]+h[12]
assert at==len(directory)
args.out.mkdir(parents=True,exist_ok=True)
members=[]
for name in names:
    pin=expected[name];e=entries['big-data-bowl-data/'+name];path=args.out/name
    assert e['method']==8 and not e['flags']&1 and e['raw']==pin['bytes']
    if path.exists():
        digest=hashlib.sha256()
        with path.open('rb') as f:
            for block in iter(lambda:f.read(1<<20),b''):digest.update(block)
        if path.stat().st_size==pin['bytes'] and digest.hexdigest()==pin['sha256']:
            members.append({'path':str(path),**pin,'cached':True,'sha256Verified':True});print('verified cache',name,flush=True);continue
        raise RuntimeError('Existing selected member has wrong bytes; refusing to overwrite it: '+name)
    local=read_range(e['local'],e['local']+29)
    l=struct.unpack('<4s5H3I2H',local);assert l[0]==b'PK\x03\x04' and l[3]==8
    names_extra=read_range(e['local']+30,e['local']+30+l[9]+l[10]-1)
    assert names_extra[:l[9]].decode()=='big-data-bowl-data/'+name
    first=e['local']+30+l[9]+l[10];last=first+e['compressed']-1
    assert last<archive_size
    temporary=path.with_suffix(path.suffix+'.partial');digest=hashlib.sha256();crc=0;written=received=0
    decoder=zlib.decompressobj(-15)
    print('retrieving',name,'compressedBytes',e['compressed'],'verifiedRawBytes',e['raw'],flush=True)
    with open_range(first,last) as r,temporary.open('wb') as f:
        while received<e['compressed']:
            block=r.read(min(1<<20,e['compressed']-received));assert block,'Truncated range'
            received+=len(block);downloaded+=len(block);data=decoder.decompress(block)
            written+=len(data);assert written<=pin['bytes']
            f.write(data);digest.update(data);crc=zlib.crc32(data,crc)
        data=decoder.flush();written+=len(data);f.write(data);digest.update(data);crc=zlib.crc32(data,crc)
    assert decoder.eof and not decoder.unused_data and received==e['compressed']
    assert written==pin['bytes'] and digest.hexdigest()==pin['sha256'] and crc==e['crc']
    temporary.rename(path)
    members.append({'path':str(path),**pin,'cached':False,'compressedBytes':e['compressed'],'sha256Verified':True,'zipCrcVerified':True})
    print('member SHA256 verified',name,flush=True)
result={'protocol':'bdb2025-selected-member-acquisition-v1','source':source['sourceUrl'],
    'archiveBytes':archive_size,'catalogArchiveSha256':source['archiveSha256'],'wholeArchiveDownloaded':False,
    'wholeArchiveChecksumVerified':False,'selectedMembersIndividuallyVerified':True,
    'memberHashAuthority':'data/reviews/run-game-coordination/nfl-reference.json','members':members,
    'downloadedBytes':downloaded,'elapsedSeconds':time.perf_counter()-start,
    'redistribution':'Raw provider tracking remains ignored/local; publish aggregates and source attribution only.'}
args.receipt.parent.mkdir(parents=True,exist_ok=True);args.receipt.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'downloadedBytes':downloaded,'membersVerified':len(members),'elapsedSeconds':result['elapsedSeconds']}))
