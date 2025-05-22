'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'
import './EmailBuilder.css'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function EmailBuilder({ initialHtml = '', onClose, onHtmlChange }) {



  const editorRef = useRef(null)
  const editorInstanceRef = useRef(null)

  const query = useQuery()
  const templateName = query.get('template')
  const [fileName, setFileName] = useState('email-template')

  useEffect(() => {
    if (templateName) {
      setFileName(templateName.replace('.html', ''))
    }
  }, [templateName])

  useEffect(() => {
  if (editorRef.current && !editorInstanceRef.current) {
    const editor = grapesjs.init({
      container: editorRef.current,
      height: '100vh',
      width: 'auto',
      fromElement: false,
      storageManager: false,
      plugins: [],
      blockManager: { appendTo: '#blocks' },
      panels: {
  defaults: [
    {
      id: 'commands',
      el: '.panel__commands',
      buttons: [
        {
          id: 'save-html',
          className: 'btn-save-html',
          label: 'Save',
          command: 'save-html',
        },
        {
          id: 'close-editor',
          className: 'btn-close-editor',
          label: 'Close',
          command: 'close-editor',
        },
        {
          id: 'export-html',
          className: 'btn-export-html',
          label: 'Export',
          command: 'export-html',
        },
      ],
    },
    {
      id: 'options',
      el: '.panel__options',
      buttons: [
        { id: 'undo', className: 'fa fa-undo', command: 'core:undo', attributes: { title: 'Undo' } },
        { id: 'redo', className: 'fa fa-repeat', command: 'core:redo', attributes: { title: 'Redo' } },
        { id: 'clear', className: 'fa fa-trash', command: 'core:canvas-clear', attributes: { title: 'Clear canvas' } },
      ],
    },
    {
      id: 'views',
      el: '.panel__views',
      buttons: [
        { id: 'open-blocks', active: true, label: 'Blocks', command: 'open-blocks', togglable: false },
        { id: 'open-sm', label: 'Style', command: 'open-sm', togglable: false },
        { id: 'open-traits', label: 'Settings', command: 'open-traits', togglable: false },
      ],
    },
  ],
},


      styleManager: { appendTo: '#style-manager' },
      traitManager: { appendTo: '#traits-manager' },
    });

    editorInstanceRef.current = editor;

    if (initialHtml) {
  editor.setComponents(initialHtml);
}

    // Add basic blocks
    editor.BlockManager.add('section', {
      label: 'Section',
      category: 'Basic',
      content: '<section><h1>Section Title</h1></section>',
    });

    editor.BlockManager.add('text', {
      label: 'Text',
      category: 'Basic',
      content: '<div data-gjs-type="text">Insert your text here</div>',
    });

    editor.BlockManager.add('image', {
      label: 'Image',
      category: 'Basic',
      content: { type: 'image' },
    });

    // Save command
    editor.Commands.add('save-html', {
      run: function (editor) {
        const html = editor.getHtml();
        const filename = fileName || 'email-template';

        fetch('http://localhost:4000/save-html', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filename, html }),
        })
          .then(res => res.json())
          .then(data => alert(data.message))
          .catch(err => alert('Error saving file: ' + err.message));
      },
    });

    // Export command
editor.Commands.add('export-html', {
  run: function (editor) {
    const html = editor.getHtml();
    alert(html);
  },
});


    // Close command
    editor.Commands.add('close-editor', {
      run: () => {
        if (onClose) onClose();
      }
    });

    editor.on('update', () => {
  const html = editor.getHtml();
  if (onHtmlChange) onHtmlChange(html);
});


    // Load template from props
    if (initialHtml) {
      editor.setComponents(initialHtml);
    } else if (templateName) {
      // fallback to URL param
      fetch(`http://localhost:4000/templates/${templateName}`)
        .then(res => res.text())
        .then(html => editor.setComponents(html))
        .catch(err => {
          console.error('Error loading template:', err);
          alert('Could not load template.');
        });
    }
  }
}, [fileName, templateName, initialHtml, onClose]);


  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const content = await file.text()
    const editor = editorInstanceRef.current
    if (editor) {
      editor.setComponents(content)
    }
  }

  return (
    <>
    
      <div style={{ padding: '10px', background: '#eee', display: 'flex', gap: '10px' }}>
      
        <input type="file" accept=".html" onChange={handleFileUpload} />
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="Template name"
        />
        <button
          onClick={() => editorInstanceRef.current?.runCommand('save-html')}
          style={{ padding: '5px 10px' }}
        >
          Save HTML
        </button>
      </div>

      

      <div className="grapesjs-editor" style={{ display: 'flex' }}>
        {/* <div id="blocks" style={{ width: '200px', padding: '10px', background: '#f5f5f5' }}></div> */}
       <div id="blocks" style={{ width: '200px', padding: '10px', background: '#f5f5f5' }}>
  <div className="custom-panels">
    <div className="panel__commands" style={{ marginBottom: '10px' }}></div>
    <div className="panel__options" style={{ marginBottom: '10px' }}></div>
    <div className="panel__views" style={{ marginBottom: '10px' }}></div>
  </div>
  <div id="custom-blocks-container"></div>
</div>


        <div style={{ flex: 5 }}>
          <div ref={editorRef}></div>
        </div>
        <div id="style-manager" style={{ width: '250px', padding: '10px', background: '#f0f0f0' }}></div>
      </div>
      {onClose && (
  <button onClick={onClose} style={{ margin: '10px' }}>
    ← Back to Templates
  </button>
)}

    </>
  )
}
