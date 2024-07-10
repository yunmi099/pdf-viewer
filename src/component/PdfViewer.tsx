import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/webpack';
import Tesseract from 'tesseract.js';

// PDF.js의 워커 파일 경로 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdfjs-dist/build/pdf.worker.entry`;

const PdfViewer = ({ file }: { file: File }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [parsedTables, setParsedTables] = useState<string[][][]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  const onDocumentLoadSuccess = (pdf: pdfjsLib.PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
    renderPage(pdf, currentPage);
  };

  const renderPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number) => {
    if (renderTaskRef.current) {
      try {
        await renderTaskRef.current.cancel();
      } catch (error) {
        console.error('Failed to cancel render task:', error);
      }
    }

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 , rotation: 0});
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
        extractTextFromCanvas(canvas);
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

  const extractTextFromCanvas = async (canvas: HTMLCanvasElement) => {
    const { data: { text } } = await Tesseract.recognize(canvas, 'kor', {
      logger: (m) => console.log(m),
    });
    const tableData = extractTableData(text);
    setParsedTables(prev => [...prev, tableData]);
  };

  const extractTableData = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const tableLines = lines.filter(line => /^\d+/.test(line)); // 숫자로 시작하는 줄 필터링
    const table = tableLines.map(line => line.split(/\s+/)); // 공백으로 나눠서 배열로 만듦
    return table;
  };

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

  const goToPrevPage = () => {
    if (currentPage > 1 && numPages) {
      setCurrentPage(currentPage - 1);
    }
  };

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
      {/* <div>
        <h2>Parsed Tables:</h2>
        {parsedTables.map((table, tableIndex) => (
          <div key={tableIndex}>
            <h3>Table {tableIndex + 1}</h3>
            <table>
              <tbody>
                {table.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div> */}
    </div>
  );
};

export default PdfViewer;
