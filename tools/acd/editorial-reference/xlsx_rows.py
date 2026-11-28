"""Read tracked XLSX source rows using only the Python standard library; never author workbooks."""
import sys,json,zipfile,io,xml.etree.ElementTree as E,posixpath
N={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as z:
 strings=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  strings=[''.join(n.itertext()) for n in E.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',N)]
 rels={x.attrib['Id']:x.attrib['Target'] for x in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 result=[]
 for sheet in E.fromstring(z.read('xl/workbook.xml')).find('s:sheets',N):
  target=rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
  target=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
  rows=[]
  for row in E.fromstring(z.read(target)).findall('s:sheetData/s:row',N):
   cells={}
   for c in row.findall('s:c',N):
    v=c.find('s:v',N);text=v.text if v is not None else ''
    if c.attrib.get('t')=='s':text=strings[int(text)]
    elif c.attrib.get('t')=='inlineStr':text=''.join(c.find('s:is',N).itertext())
    if text:cells[c.attrib['r']]=text
   if cells:rows.append({'row':int(row.attrib['r']),'cells':cells})
  result.append({'sheet':sheet.attrib['name'],'rows':rows})
 print(json.dumps(result,ensure_ascii=False))
