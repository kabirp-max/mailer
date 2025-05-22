import React, { useState } from 'react';

const MJMLEditor = () => {
  const [mjmlCode, setMjmlCode] = useState(`
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text font-size="20px" color="#F45E43" font-family="helvetica">Hello MJML!</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
  `);

  const [renderedHtml, setRenderedHtml] = useState('');

  const handleRender = async () => {
    const res = await fetch('http://localhost:4000/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mjmlCode }),
    });

    const data = await res.json();
    if (data.html) setRenderedHtml(data.html);
    else alert('Error rendering MJML');
  };

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      <div style={{ width: '50%' }}>
        <h3>MJML Code</h3>
        <textarea
          rows="30"
          style={{ width: '100%' }}
          value={mjmlCode}
          onChange={(e) => setMjmlCode(e.target.value)}
        />
        <button onClick={handleRender}>Render</button>
      </div>
      <div style={{ width: '50%' }}>
        <h3>Email Preview</h3>
        <iframe
          title="Preview"
          srcDoc={renderedHtml}
          style={{ width: '100%', height: '700px', border: '1px solid #ccc' }}
        />
      </div>
    </div>
  );
};

export default MJMLEditor;
