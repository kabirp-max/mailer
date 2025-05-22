import React, { useEffect, useState } from 'react';
import axios from 'axios';

function TemplatesPage({ onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [previewHtml, setPreviewHtml] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    axios.get('http://localhost:4000/api/templates')
      .then(res => setTemplates(res.data))
      .catch(console.error);
  }, []);

  const previewTemplate = (filename) => {
    setSelectedTemplate(filename);
    axios.get(`http://localhost:4000/api/templates/${filename}`)
      .then(res => setPreviewHtml(res.data))
      .catch(console.error);
  };

  const goBack = () => {
    setSelectedTemplate('');
    setPreviewHtml('');
  };

  return (
    <div style={{ display: 'flex' }}>
      {!selectedTemplate && (
        <div style={{ width: '30%', padding: 10 }}>
          <h3>Templates</h3>
          <ul style={{ display: "flex", flexWrap: "wrap", gap: "20px", listStyle: "none", padding: 0 }}>
            {templates.map(file => {
              const filename = file.replace('.html', '');
              const imagePath = `/photos/${filename}.png`;

              return (
                <li
                  key={file}
                  onClick={() => previewTemplate(file)}
                  style={{
                    cursor: 'pointer',
                    marginBottom: 10,
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <img
                    src={imagePath}
                    alt={filename}
                    style={{
                      width: '160px',
                      height: '240px',
                      objectFit: 'contain',
                      borderRadius: '4px',
                      border: '2px solid black'
                    }}
                  />
                  <div>{file}</div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {selectedTemplate && (
        <div style={{ flex: 1, padding: 10 }}>
          <h3>Preview: {selectedTemplate}</h3>
          <div
            style={{
              border: '1px solid #ccc',
              minHeight: '300px',
              padding: '10px',
              marginBottom: '10px'
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => onSelectTemplate(previewHtml)}>
              Edit This Template
            </button>
            <button onClick={goBack}>
              Back to Templates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesPage;
