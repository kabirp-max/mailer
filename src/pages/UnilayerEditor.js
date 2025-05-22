import React, { useEffect, useRef } from 'react';

const UnlayerEditor = () => {
  const editorRef = useRef(null);

  useEffect(() => {
    // Initialize Unlayer editor
    window.unlayer.init({
      id: 'unlayer-editor',
      projectId: 1234, // optional; you can remove or change this
      displayMode: 'email',
      // You can customize tools here if you want
    });

    // Listen for save event to get the design JSON and HTML
    window.unlayer.addEventListener('design:save', function (data) {
      // data contains design JSON and html content
      console.log('Design JSON:', data.design);
      console.log('HTML:', data.html);
      alert('Design saved! Check console for output.');
    });
  }, []);

  // Function to trigger save action programmatically
  const saveDesign = () => {
    window.unlayer.saveDesign();
  };

  return (
    <div>
      <div
        id="unlayer-editor"
        ref={editorRef}
        style={{ height: '600px', border: '1px solid #ddd' }}
      />
      <button onClick={saveDesign} style={{ marginTop: '10px' }}>
        Save Design
      </button>
    </div>
  );
};

export default UnlayerEditor;
