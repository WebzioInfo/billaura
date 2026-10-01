import multer from 'multer';
import express from 'express';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/test', upload.single('logo'), (req: any, res: any) => {
  console.log("Req.file:", req.file);
  console.log("Req.body:", req.body);
  res.json({ file: req.file ? "received" : "missing", body: req.body });
});

app.listen(4005, async () => {
  console.log("Test server listening on 4005");

  const dummyHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const dummyFile = new File([dummyHeader], 'test.png', { type: 'image/png' });

  const formData = new FormData();
  formData.append('logo', dummyFile);
  formData.append('name', 'test');

  const res = await fetch('http://localhost:4005/test', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  console.log("Test Response:", json);
  process.exit(0);
});
