# SK매직 공식 후기 실시간 연동

## 구성
- `review-config.js`: 배포한 Cloudflare Worker 주소를 설정하는 파일
- `cloudflare-worker/skmagic-review-worker.js`: SK매직 공식몰의 후기 HTML을 요청하고 JSON으로 변환하는 중계 Worker
- 제품 데이터의 `officialReview`: 내부 가격/상품 식별값과 분리된 공식몰 후기 연결 정보
- `app.js` / `index.html` / `styles.css`: 제품 카드의 '실사용 후기' 버튼과 태블릿용 후기 패널

## 현재 연결된 모델
- 모델명: `WPU-IAC606`
- 공식몰 goodsId: `G000069931`
- 공식몰 prdtCd: `WPUIAC606SNW`
- compGbCd: `10`

기존 e-book의 `apiId`, 가격표 키, 공식 상세 URL은 변경하지 않습니다. 공식 후기 연결은 모델명으로 조회하고, 공식몰 상품번호는 후기 중계 Worker의 별도 매핑에서만 사용합니다.

## Cloudflare Worker 배포
1. Cloudflare 대시보드에서 **Workers & Pages → Create → Worker**를 선택합니다.
2. Worker 이름을 예: `skmagic-review-api`로 정합니다.
3. `cloudflare-worker/skmagic-review-worker.js` 전체 내용을 붙여넣고 Deploy 합니다.
4. 배포된 주소가 `https://<worker-name>.<account>.workers.dev` 형태로 표시됩니다.
5. 저장소의 `review-config.js`에서 빈 문자열을 배포 주소로 바꿉니다.
   ```js
   window.SK_REVIEW_API_BASE = 'https://<worker-name>.<account>.workers.dev';
   ```
6. GitHub Pages 배포 후 제품 카드에서 **실사용 후기**를 눌러 확인합니다.

## 호출 예시
- 전체 후기: `GET /reviews?model=WPU-IAC606&page=1&photos=0`
- 포토 후기: `GET /reviews?model=WPU-IAC606&page=1&photos=1`

후기는 페이지 단위로 실시간 조회하며, 후기 본문이나 사진 파일을 이 저장소에 복제하지 않습니다. 사진 URL은 공식몰의 정적 이미지 주소를 그대로 사용합니다.

## 주의 및 검증
- Worker는 공개 후기 요청만 수행하며 사용자 로그인 쿠키/인증정보를 전달하지 않습니다.
- 공식몰이 비로그인 요청을 차단하거나 응답 HTML 구조를 변경하면 Worker 파서를 조정해야 합니다.
- 현재는 WPU-IAC606 한 모델만 매핑되어 있습니다. 다른 모델은 해당 제품의 공식몰 상세페이지에서 Network 요청의 `goodsId`, `prdtCd`, `compGbCd`를 확인한 후 `MODEL_MAP`에 추가해야 합니다.
- 이 Worker는 실제 Cloudflare 계정에 배포되지 않았습니다. 배포와 Worker 주소 설정 후에야 브라우저에서 실시간 조회가 활성화됩니다.
