import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import PdfViewer from './component/PdfViewer';

function App() {
  const [file, setFile] = useState<File | null>(null);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <input type="file" onChange={onFileChange} />
        {file && <PdfViewer file={file} />}
      </header>
    </div>
  );
}

export default App;