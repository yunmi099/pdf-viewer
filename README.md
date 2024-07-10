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

   ```
   git clone https://github.com/yunmi099/pdf-viewer.git
   ```
2. 프로젝트 디렉토리로 이동합니다.

   ```
   cd pdf-viewer
   ```
3. 필요한 패키지를 설치합니다.
   ```
   npm install
   ```
4. 실행
   개발 서버를 시작합니다.
   ```
   npm start
   ```
5. 웹 브라우저에서 http://localhost:3000 주소로 접속합니다.

## main branch
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

## matrixToTable

PDF.js 라이브러리에서 제공하는 텍스트 항목들을 받아서, 이를 행(row)과 열(column) 형태로 정리하여 2차원 배열로 반환합니다.

```
const parseTextContent = (items: TextItem[]): string[][] => {
  // 각 행을 저장할 객체를 만듭니다. 행의 Y 좌표를 키로 사용합니다.
  const rows: { [key: number]: { text: string, x: number }[] } = {};

  // 각 텍스트 항목을 순회합니다.
  items.forEach((item) => {
    const transform = item.transform; // 텍스트 항목의 변환 매트릭스를 가져옵니다.
    const x = transform[4]; // 텍스트의 X 좌표
    const y = transform[5]; // 텍스트의 Y 좌표
    const text = item.str; // 실제 텍스트 내용

    // Y 좌표를 키로 하는 행이 없으면 새로 만듭니다.
    if (!rows[y]) {
      rows[y] = [];
    }

    // 해당 행에 텍스트 항목을 추가합니다.
    rows[y].push({ text, x });
  });

  // 행들을 Y 좌표 기준으로 정렬합니다 (Y 값이 큰 것부터 작은 순서로).
  const sortedRows = Object.keys(rows)
    .sort((a, b) => parseFloat(b) - parseFloat(a))
    .map((y) => {
      const row = rows[parseFloat(y)];
      // 각 행의 텍스트 항목들을 X 좌표 기준으로 정렬합니다.
      row.sort((a, b) => a.x - b.x);
      // 정렬된 텍스트 항목들의 텍스트 내용만 추출하여 배열로 만듭니다.
      return row.map((cell) => cell.text);
    });

  console.log('Parsed Table Data:', sortedRows);
  return sortedRows; // 최종적으로 파싱된 행렬 데이터를 반환합니다.
};
```

## ocrExtractTable
PDF 페이지를 캔버스에 렌더링한 후, Tesseract.js를 사용하여 텍스트를 추출하고, 추출된 텍스트에서 테이블 데이터를 인식하여 저장하는 방식으로 동작합니다. 이를 통해 PDF 파일의 특정 페이지에 포함된 표 형식의 데이터를 추출하고자 했습니다.

```
// 텍스트에서 테이블 데이터를 추출하는 함수
const extractTableData = (text: string): string[][] => {
  const lines = text.split('\n').filter(line => line.trim() !== ''); // 빈 줄 제거
  const tableLines = lines.filter(line => /^\d+/.test(line)); // 숫자로 시작하는 줄 필터링
  const table = tableLines.map(line => line.split(/\s+/)); // 공백으로 나눠서 배열로 변환
  return table;
};

// 캔버스에서 텍스트 추출하는 함수
const extractTextFromCanvas = async (canvas: HTMLCanvasElement) => {
  const { data: { text } } = await Tesseract.recognize(canvas, 'kor', {
    logger: (m) => console.log(m),
  });
  const tableData = extractTableData(text); // 텍스트에서 테이블 데이터 추출
  setParsedTables(prev => [...prev, tableData]); // 추출된 테이블 데이터를 상태에 추가
};
```

다음과 같이 다양한 방식으로 테이블을 추출하고자 하였으나 테이블을 인식하는데 어려움을 겪어, 원하는 텍스트를 직접 파싱하여 테이블 형태로 표시하는 방식으로 구현하게 되었습니다. 
