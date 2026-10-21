# 서당 자산 구성

## 참고 시트

- `케이네의 서당_ 사계절 학당 풍경.png`: 건물, 지붕, 현판, 종이창, 돌계단과 실내 소품 스타일 참고.
- `따뜻한 이소메트릭 일본식 공부방 교실(1).png`: 높은 사선 쿼터뷰, 컷어웨이, 자연광과 목재 질감 참고.

위 원본 파일은 수정하지 않았습니다. 게임은 시트 전체를 배경으로 사용하지 않습니다.

## 별도 제작 자산

내장 이미지 생성 도구를 사용했습니다. 생성 이미지는 아래 게임 폴더에 복사되어 있으며 외부 생성 경로에 의존하지 않습니다. 별도 CLI/API는 사용하지 않았습니다.

- `assets/room-shell.png`: 빈 바닥, 양쪽 뒤 벽, 창문, 기단. 가구/사람 없음.
- `assets/school-exterior.png`: 기존 서당 부지에 표시하는 독립 건물.
- `assets/classroom-atlas.png`: 책상/교탁/책장/판서판 및 익명 마을 학생 4명. 아래 영역으로 분리 렌더링하며 전체 시트를 그대로 표시하지 않음.

| 객체 | source x,y,w,h |
|---|---|
| 학생 책상 | 39,199,333,269 |
| 교탁 | 420,118,444,361 |
| 책장 | 928,2,291,479 |
| 판서판 | 1280,30,479,469 |
| 학생 1 | 114,502,229,354 |
| 학생 2 | 546,507,216,349 |
| 학생 3 | 977,497,229,362 |
| 학생 4 | 1425,511,228,346 |

캐릭터와 가구의 투명 여백은 런타임 알파 경계로 제외하며 가로세로 비율은 유지합니다. 기존 케이네와 준하는 원본 캐릭터 시트를 재사용합니다.

## 사용한 제작 지시

### 빈 실내 구조
Use case: stylized-concept. GAME ASSET, empty modular architectural room shell. Use the attached warm classroom image solely as the architectural visual reference, NOT an edit target. Create the same high angled 2.5D JRPG pixel art cutaway Japanese wood terakoya classroom with a wide empty wooden plank floor, left wall shoji windows, back wall timber and plaster, warm bright daylight. Camera high diagonal isometric quarter view, front two walls removed. IMPORTANT NO people, NO desks, NO chairs, NO blackboard, NO bookcases, NO lantern props, NO standing furniture: empty floor and two rear walls only, we will place actual independently rendered furniture and characters over it. Room floor diamond corners approximately (150,510),(780,240),(1440,530),(800,900) in a 1536x1024 canvas; generous complete uncut architecture, visible stone foundation thickness below floor, small central entrance gap at near-left front edge. Back wall timber details and beautiful paper windows. Crisp richly textured JRPG pixel art rather than painted glossy illustration. Real transparent exterior outside the room, no background/checkerboard. Do not include text, labels, borders or contact sheet. Preserve the reference camera and warm amber wood/plaster palette.

### 건물
Use case: stylized-concept. Single standalone game building sprite, transparent background. Use first attached sheet as reference for a traditional Japanese village terakoya school exterior. No collage, no text panels. High diagonal JRPG pixel art, front facade faces down-right and right-side facade visible, same orientation as the school on left of reference sheet. Beautiful dark blue-grey kawara tile roof, honey-colored wooden beams, cream paper shoji windows, central indigo noren entrance curtain, small gold wood plaque with just 修学 above door, three stone steps, two small warm lanterns, small potted flowers at facade. NO people, no trees, no surrounding village, no large ground square, building fully visible uncut with small transparent margin. Match existing JRPG dot art camera, texture, detail and proportions. Do not change reference into western architecture.

### 가구·학생
Use case: stylized-concept. Production game sprite atlas for a high diagonal isometric Japanese terakoya, matching the attached classroom reference's warm JRPG pixel art, do not make whole classroom. Transparent background. A STRICT evenly spaced 4 columns by 2 rows grid of EIGHT separate fully contained assets, each fitting its own equal cell with broad empty margin, no objects crossing cells. No grid lines, no labels, no written headings. Top row left to right: (1) one brown wooden STUDENT DESK ONLY with open book, brush and small inkstone, NO chair or person; (2) wooden teacher desk with stacked books and inkstone, NO teacher; (3) one tall filled wooden bookcase; (4) large dark chalkboard in warm wooden freestanding frame with subtle correct Japanese chalk marks 日 月 火 水 木 金 土. Bottom row left to right: (5) ordinary village schoolboy with short black hair, seated on a small wooden chair facing the rear-right teacher's wall, grey-blue traditional village clothes, no desk; (6) ordinary village schoolgirl with brown hair tied back, seated on chair, muted plum kimono, same rear-right facing direction, no desk; (7) ordinary village schoolboy with chestnut hair, seated on chair, moss green traditional clothes, same direction, no desk; (8) ordinary village schoolgirl with black bob hair, seated on chair, cream and rust village clothes, same direction, no desk. These four are anonymous human village children, NOT Touhou named characters, no modern school uniforms, no pink fantasy hair, no weapons. All furniture camera matches reference elevated 2.5D perspective. Include full chair and feet; rich restrained dot textures, crisp pixels. Genuine transparent background, not checkerboard. Aspect ratio 2:1 wide atlas.
