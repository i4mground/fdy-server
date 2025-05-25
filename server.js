const express = require('express');
const cors = require('cors');        // ✏️ cors 패키지 추가
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 5000;

// Body parser (필요에 따라)
app.use(express.json());

// CORS 설정
app.use(cors({
  origin: 'http://localhost:3000',             // 허용할 도메인
  methods: ['GET', 'POST', 'PUT', 'DELETE'],   // 허용할 HTTP 메서드
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true                            // 쿠키 전송이 필요하면 true
}));
// 모든 라우트에 대해 preflight 요청 허용
app.options('*', cors());


// MongoDB 연결
const dbUri = process.env.DB_URI;
mongoose.connect(dbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// 스키마 정의
const flowerSchema = new mongoose.Schema({
  flowername: String,
  habitat: String,
  binomialName: String,
  classification: String,
  flowername_kr: String
});
const Flower = mongoose.model('Flower', flowerSchema, 'flowers');

// 꽃 정보 조회
app.get('/flowers', async (req, res) => {
  const { flowername } = req.query;
  try {
    const flower = await Flower.findOne({
      $or: [
        { flowername },
        { flowername_kr: flowername }
      ]
    });

    if (!flower) {
      return res.status(404).json({ error: 'Flower not found' });
    }
    const { flowername: en, habitat, binomialName, classification, flowername_kr: kr } = flower;
    res.json({ flowername: en, habitat, binomialName, classification, flowername_kr: kr });
  } catch (error) {
    console.error('Error retrieving flower information:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// 네이버 쇼핑 검색
app.get('/naver-shopping', async (req, res) => {
  const { flowername } = req.query;
  if (!flowername) {
    return res.status(400).json({ error: 'Flowername is required' });
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const displayPerPage = 100;
  const maxResults = 1000;
  let start = 1;
  const allResults = [];

  try {
    while (start <= maxResults) {
      const apiUrl = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(flowername)}&display=${displayPerPage}&start=${start}&sort=sim`;
      const response = await axios.get(apiUrl, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      });
      const items = response.data.items || [];
      if (!items.length) break;
      allResults.push(...items);
      start += displayPerPage;
    }
    console.log(`총 ${allResults.length}개의 검색 결과를 가져왔습니다.`);
    res.json({ items: allResults });
  } catch (error) {
    console.error('네이버 쇼핑 API 오류:', error);
    res.status(500).json({ error: 'Naver Shopping API error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
