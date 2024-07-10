import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/webpack';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

// PDF.js의 워커 파일 경로 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdfjs-dist/build/pdf.worker.entry`;

const PdfViewer = ({ file }: { file: File }) => {
  // 상태 관리: 페이지 수, 현재 페이지, 파싱된 콘텐츠
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [parsedContent, setParsedContent] = useState<string[][][]>([]);
  
  // ref 설정: 캔버스와 렌더링 작업 참조
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // PDF가 성공적으로 로드되었을 때 호출되는 함수
  const onDocumentLoadSuccess = (pdf: pdfjsLib.PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
    renderPage(pdf, currentPage);
    parsePdf(pdf);
  };

  // 페이지를 렌더링하는 함수
  const renderPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number) => {
    if (renderTaskRef.current) {
      try {
        await renderTaskRef.current.cancel();
      } catch (error) {
        console.error('페이지 렌더링 실패', error);
      }
    }

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1, rotation: 0 });
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

    renderTaskRef.current = page.render(renderContext);
    renderTaskRef.current.promise.then(
      () => {
        renderTaskRef.current = null;
      },
      (error: any) => {
        if (error.name === 'RenderingCancelledException') {
          console.log('렌더링 취소 :', error);
        } else {
          console.error('렌더링 에러 :', error);
        }
      }
    );
  };

  // PDF를 파싱하는 함수
  const parsePdf = async (pdf: pdfjsLib.PDFDocumentProxy) => {
    const parsedData: string[][][] = []; // 각 페이지의 파싱된 데이터를 저장할 배열

    // PDF의 각 페이지를 순회하면서 텍스트 콘텐츠를 파싱합니다.
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum); // 각 페이지를 가져옵니다.
      const textContent = (await page.getTextContent()) as { items: TextItem[] }; // 텍스트 콘텐츠를 가져옵니다.
      const parsedPageData = parseTextContent(textContent.items); // 텍스트 콘텐츠를 파싱합니다.
      parsedData.push(parsedPageData); // 파싱된 데이터를 배열에 추가합니다.
    }
    setParsedContent(parsedData); // 파싱된 데이터를 상태로 설정합니다.
  };

  // 텍스트 콘텐츠를 파싱하는 함수
  const parseTextContent = (items: TextItem[]): string[][] => {
    const leftResult: string[] = []; // 좌측 열 결과를 저장할 배열
    const rightResult: string[] = []; // 우측 열 결과를 저장할 배열
    let accumulatedLeftStr: string = ''; // 좌측 열의 누적 문자열
    let accumulatedRightStr: string = ''; // 우측 열의 누적 문자열

    const centerX = 300; // 중앙 기준값 (PDF 페이지 크기에 따라 조정 필요)
    const pageRegex = /-\s*\d+\s*-/; // 페이지 정보 정규식

    // 각 텍스트 아이템을 순회하면서 좌우 열로 분류합니다.
    items.forEach((item) => {
      const x = item.transform[4]; // x 좌표를 가져옵니다.
      const isPageInfo = pageRegex.test(item.str); // 페이지 정보인지 확인합니다.

      if (!isPageInfo) { // 페이지 정보가 아닌 경우에만 처리합니다.
        if (x < centerX) { // x 좌표가 중앙 기준값보다 작으면 좌측 열로 간주합니다.
          accumulatedLeftStr += item.str; // 좌측 열 문자열에 추가합니다.
          if (item.hasEOL && accumulatedLeftStr.trim().length > 0) { // 개행이 있는 경우
            leftResult.push(accumulatedLeftStr); // 좌측 열 결과에 추가합니다.
            accumulatedLeftStr = ''; // 누적 문자열을 초기화합니다.
          }
        } else { // x 좌표가 중앙 기준값보다 크면 우측 열로 간주합니다.
          accumulatedRightStr += item.str; // 우측 열 문자열에 추가합니다.
          if (item.hasEOL && accumulatedRightStr.trim().length > 0) { // 개행이 있는 경우
            rightResult.push(accumulatedRightStr); // 우측 열 결과에 추가합니다.
            accumulatedRightStr = ''; // 누적 문자열을 초기화합니다.
          }
        }
      }
    });

    return [leftResult, rightResult]; // 좌측 열과 우측 열 결과를 반환합니다.
  };

  // 파일이 변경되었을 때 PDF를 로드합니다.
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

  // 현재 페이지가 변경되었을 때 페이지를 렌더링합니다.
  useEffect(() => {
    if (file && numPages) {
      const reader = new FileReader();
      reader.onload = function () {
        const result = this.result;
        if (result && typeof result !== 'string') {
          const typedArray = new Uint8Array(result);
          const loadingTask = pdfjsLib.getDocument({ data: typedArray });
          loadingTask.promise.then(pdf => {
            renderPage(pdf, currentPage);
          });
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, [currentPage, numPages]);

  // 이전 페이지로 이동하는 함수
  const goToPrevPage = () => {
    if (currentPage > 1 && numPages) {
      setCurrentPage(currentPage - 1);
    }
  };

  // 다음 페이지로 이동하는 함수
  const goToNextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // 테이블을 렌더링하는 함수
  const renderTable = () => {
    let startFound = false; // "신·구조문대비표"를 찾았는지 여부를 추적하는 변수
    // 파싱된 콘텐츠를 좌우 열로 분리하여 하나의 배열로 병합합니다.
    const mergedContent = parsedContent.reduce<{ leftColumn: string[]; rightColumn: string[] }>((acc, pageContent) => {
      // "신·구조문대비표"를 찾았거나 이미 찾은 경우, 해당 페이지의 콘텐츠를 추가합니다.
      if (startFound || pageContent[0][0] === "신·구조문대비표") {
        startFound = true; // "신·구조문대비표"를 찾았음을 표시합니다.
        acc.leftColumn.push(...pageContent[0].slice(startFound ? 0 : 1)); // 좌측 열 콘텐츠를 추가합니다.
        acc.rightColumn.push(...pageContent[1].slice(startFound ? 0 : 1)); // 우측 열 콘텐츠를 추가합니다.
      }
      return acc; // 병합된 콘텐츠를 반환합니다.
    }, { leftColumn: [], rightColumn: [] });

    return (
      <table>
        <thead>
          <tr>
            <th>현행</th> {/* 좌측 열 헤더 */}
            <th>개정안</th> {/* 우측 열 헤더 */}
          </tr>
        </thead>
        <tbody>
          {/* 좌우 열의 최대 길이에 따라 행을 생성합니다. */}
          {Array.from({ length: Math.max(mergedContent.leftColumn.length, mergedContent.rightColumn.length) }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {/* 좌측 열의 내용이 존재하지 않으면 빈 문자열을 표시합니다. */}
              <td>{mergedContent.leftColumn[rowIndex] || ''}</td>
              {/* 우측 열의 내용이 존재하지 않으면 빈 문자열을 표시합니다. */}
              <td>{mergedContent.rightColumn[rowIndex] || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // 컴포넌트 렌더링
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
        <h2>신·구조문대비표</h2>
        {renderTable()}
      </div>
    </div>
  );
};

export default PdfViewer;