import urllib.request,io
from pypdf import PdfReader
base='https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Information-Technology/2016/'
for path in ['External-assessments/asg-unit14-20161k-amended.pdf','specification-and-sample-assessments/u14-it-service-delivery-task-sam.pdf']:
 r=PdfReader(io.BytesIO(urllib.request.urlopen(base+path).read()))
 print(path)
 print('\n'.join(p.extract_text()[:6500] for p in r.pages[:3]))
