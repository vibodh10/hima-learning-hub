import urllib.request,io,json
from pypdf import PdfReader
u='https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Information-Technology/2016/external-assessment/BTEC%20Guide%20to%20External%20%20Assessment%20Information%20Technology.pdf'
r=PdfReader(io.BytesIO(urllib.request.urlopen(u).read()))
print(json.dumps([a.get_object().get('/A',{}).get('/URI') for a in r.pages[7].get('/Annots',[])],indent=2))
