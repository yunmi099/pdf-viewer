import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/webpack';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

// PDF.js의 워커 파일 경로 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdfjs-dist/build/pdf.worker.entry`;

const PdfViewer = ({ file }: { file: File }) => {
  // 상태 훅을 사용하여 페이지 수, 현재 페이지, 파싱된 내용 저장
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [parsedContent, setParsedContent] = useState<string[][][]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // PDF가 성공적으로 로드되었을 때 호출되는 함수
  const onDocumentLoadSuccess = (pdf: pdfjsLib.PDFDocumentProxy) => {
    setNumPages(pdf.numPages); // 총 페이지 수 설정
    renderPage(pdf, currentPage); // 현재 페이지 렌더링
    parsePdf(pdf); // PDF 파싱 시작
  };

  // 페이지를 렌더링하는 함수
  const renderPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number) => {
    // 기존 렌더 작업이 있다면 취소
    if (renderTaskRef.current) {
      try {
        await renderTaskRef.current.cancel();
      } catch (error) {
        console.error('Failed to cancel render task:', error);
      }
    }

    const page = await pdf.getPage(pageNumber); // 페이지 가져오기
    const viewport = page.getViewport({ scale: 1.5 }); // 뷰포트 설정
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    // 페이지 렌더링
    renderTaskRef.current = page.render(renderContext);
    renderTaskRef.current.promise.then(
      () => {
        renderTaskRef.current = null;
      },
      (error: any) => {
        if (error.name === 'RenderingCancelledException') {
          console.log('Rendering cancelled:', error);
        } else {
          console.error('Rendering error:', error);
        }
      }
    );
  };

  // PDF를 파싱하는 함수
  const parsePdf = async (pdf: pdfjsLib.PDFDocumentProxy) => {
    const parsedData: string[][][] = []; // 파싱된 데이터를 저장할 배열입니다.
  
    // PDF 문서의 각 페이지를 순회합니다.
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum); // 페이지를 가져옵니다.
      const textContent = await page.getTextContent(); // 페이지의 텍스트 내용을 가져옵니다.
      const parsedPageData = parseTextContent(textContent.items as TextItem[]); // 텍스트 내용을 파싱합니다.
      parsedData.push(parsedPageData); // 파싱된 페이지 데이터를 배열에 추가합니다.
    }
  
    setParsedContent(parsedData); // 파싱된 데이터를 상태에 저장합니다.
  };
  

  // 텍스트 내용을 파싱하는 함수
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
  

  // 파일이 변경되었을 때 PDF 로드 시작
  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = function () {
        const result = this.result;
        if (result && typeof result !== 'string') {
          const typedArray = new Uint8Array(result);
          const loadingTask = pdfjsLib.getDocument({ data: typedArray });
          loadingTask.promise.then(onDocumentLoadSuccess);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, [file]);

  // 현재 페이지가 변경되었을 때 페이지 렌더링
  useEffect(() => {
    if (file && numPages) {
      const reader = new FileReader();
      reader.onload = function () {
        const result = this.result;
        if (result && typeof result !== 'string') {
          const typedArray = new Uint8Array(result);
          const loadingTask = pdfjsLib.getDocument({ data: typedArray });
          loadingTask.promise.then((pdf) => {
            renderPage(pdf, currentPage);
          });
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, [currentPage, numPages]);

  // 이전 페이지로 이동
  const goToPrevPage = () => {
    if (currentPage > 1 && numPages) {
      setCurrentPage(currentPage - 1);
    }
  };

  // 다음 페이지로 이동
  const goToNextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div>
      <div>
        <button onClick={goToPrevPage} disabled={currentPage <= 1}>
          Previous
        </button>
        <button onClick={goToNextPage} disabled={numPages ? currentPage >= numPages : true}>
          Next
        </button>
        <span>
          Page {currentPage} of {numPages}
        </span>
      </div>
      <canvas ref={canvasRef}></canvas>
      <div>
        {parsedContent.map((pageContent, pageIndex) => (
          <div key={pageIndex}>
            <h3>Page {pageIndex + 1}</h3>
            <table>
              {/* 파싱된 내용을 테이블로 표시
              <tbody>
                {pageContent.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody> */}
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PdfViewer;
