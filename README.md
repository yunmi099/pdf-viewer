# PDF Viewer

이 프로젝트는 React와 PDF.js를 사용하여 PDF 파일을 웹 페이지에서 뷰잉하고, 텍스트를 파싱하여 테이블 형태로 표시하는 애플리케이션입니다.

## 기능

- PDF 파일 업로드
- 업로드된 PDF 파일을 웹 페이지에서 뷰잉
- PDF 파일에서 신구조문을 배열 형태로 파싱
- 파싱된 텍스트를 테이블 형태로 표시

## 설치 및 실행 방법

### 버전

- NODE_VERSION : v18.17.0
- NPM_VERSION : 9.6.7

### 설치

1. 프로젝트를 클론합니다.

   ```bash
   git clone https://github.com/yunmi099/pdf-viewer.git
프로젝트 디렉토리로 이동합니다.

cd pdf-viewer
필요한 패키지를 설치합니다.

npm install
실행
개발 서버를 시작합니다.

npm start
웹 브라우저에서 http://localhost:3000 주소로 접속합니다.

## main branch
# 주요 기능
1. PDF 파일 업로드

사용자가 PDF 파일을 업로드할 수 있도록 file prop을 통해 PDF 파일을 입력받습니다.
FileReader를 사용하여 업로드된 PDF 파일을 읽고, PDF.js를 통해 PDF 문서를 로드합니다.

2. PDF 파일 뷰잉

PDF 파일의 페이지를 캔버스(canvas) 요소에 렌더링합니다.
현재 페이지를 나타내는 상태(currentPage)와 총 페이지 수(numPages)를 관리하여 사용자가 페이지를 이동할 수 있도록 합니다.
renderPage 함수는 PDF.js를 사용하여 특정 페이지를 캔버스에 렌더링합니다.

3. 신구조문 파싱

PDF 파일에서 텍스트 콘텐츠를 추출하고, 이를 parsePdf 함수에서 배열 형태로 파싱합니다.
parseTextContent 함수는 PDF 페이지의 텍스트 아이템을 좌우 열로 나누어 배열 형태로 변환합니다. 중앙 기준값(centerX)을 사용하여 좌우 열을 구분하고, 페이지 정보를 무시합니다.
파싱된 결과는 parsedContent 상태에 저장됩니다.

4. 파싱된 결과를 테이블로 표시

renderTable 함수는 파싱된 신구조문 데이터를 이용하여 테이블 형식으로 웹 페이지에 표시합니다.
startFound 변수를 사용하여 "신·구조문대비표" 이후의 내용을 파싱합니다.
좌우 열의 데이터를 병합하여 테이블 형식으로 렌더링합니다.
