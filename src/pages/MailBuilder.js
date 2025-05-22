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
  const [templates, setTemplates] = useState([])

  const loadTemplate = async (templateFile) => {
  try {
    const res = await fetch(`http://localhost:4000/api/templates/${templateFile}`);
    const html = await res.text();
    editorInstanceRef.current?.setComponents(html);
    setFileName(templateFile.replace('.html', ''));
  } catch (err) {
    console.error(`Error loading template ${templateFile}`, err);
    alert('Failed to load selected template.');
  }
};


  useEffect(() => {
    if (templateName) {
      setFileName(templateName.replace('.html', ''))
    }
  }, [templateName])

  function showNotification(message) {
  const note = document.createElement('div');
  note.innerText = message;
  Object.assign(note.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: '#4caf50',
    color: 'white',
    padding: '10px 15px',
    borderRadius: '5px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    zIndex: 9999,
  });
  document.body.appendChild(note);
  setTimeout(() => note.remove(), 3000);
}


  useEffect(() => {
    if (editorRef.current && !editorInstanceRef.current) {
      const editor = grapesjs.init({
        container: editorRef.current,
        height: '100%',
        width: '100%',
        fromElement: false,
        storageManager: false,
        blockManager: { appendTo: '#custom-blocks' },
        styleManager: { appendTo: '#style-manager' },
        traitManager: { appendTo: '#traits-manager' },
        panels: { defaults: [] },
      })

      // Load saved templates and add them as blocks
fetch('http://localhost:4000/api/templates')
  .then(res => res.json())
  .then((templateList) => {
    setTemplates(templateList)
  })
  .catch(err => console.error('Failed to load templates:', err))



      editorInstanceRef.current = editor

      if (initialHtml) {
        editor.setComponents(initialHtml)
      }

      // Add custom blocks
      editor.BlockManager.add('section', {
        label: 'Section',
        category: 'Basic',
        content: '<section><h1>Section Title</h1></section>',
      })

      editor.BlockManager.add('text', {
        label: 'Text',
        category: 'Basic',
        content: '<div data-gjs-type="text">Insert your text here</div>',
      })

      editor.BlockManager.add('image', {
        label: 'Image',
        category: 'Basic',
        content: { type: 'image' },
      })

      editor.BlockManager.add('button', {
  label: 'Button',
  category: 'Basic',
  content: `
    <a href="#" style="display: inline-block; padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none; border-radius: 4px;">
      Click Me
    </a>
  `
});

editor.BlockManager.add('image-text', {
  label: 'Image + Text',
  category: 'Content',
  content: `
    <div style="display: flex; align-items: center;">
      <img src="https://via.placeholder.com/100" style="margin-right: 10px;" />
      <p>Your text here</p>
    </div>
  `
});

editor.BlockManager.add('header', {
  label: 'Header',
  category: 'Sections',
  content: `
    <header style="text-align: center; padding: 20px; background-color: #f7f7f7;">
      <h1>Company Name</h1>
      <p>Tagline or intro text</p>
    </header>
  `
});

editor.BlockManager.add('footer', {
  label: 'Footer',
  category: 'Sections',
  content: `
    <footer style="text-align: center; padding: 20px; background-color: #f0f0f0;">
      <p>123 Street, City, Country</p>
      <p><a href="#">Unsubscribe</a></p>
    </footer>
  `
});


editor.BlockManager.add('divider', {
  label: 'Divider',
  category: 'Basic',
  content: '<hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;" />',
});


      // Commands

  editor.Commands.add('save-html', {
  run: async function (editor) {
    try {
      const rawHtml = editor.getHtml();

      // Send to backend for inlining
      const res = await fetch('http://localhost:4000/api/inline-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: rawHtml }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Inlining failed');

      const inlinedHtml = data.inlinedHtml;
      const filename = fileName || 'email-template';

      // Save to backend
      await fetch('http://localhost:4000/save-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, html: inlinedHtml }),
      });

      // Copy to clipboard
      await navigator.clipboard.writeText(inlinedHtml);
      showNotification('Saved and copied inlined HTML to clipboard!');
    } catch (err) {
      alert('Error saving file: ' + err.message);
    }
  },
});

editor.Commands.add('export-html', {
  run: async function (editor) {
    try {
      const rawHtml = editor.getHtml();

      const res = await fetch('http://localhost:4000/api/inline-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: rawHtml }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Inlining failed');

      const inlinedHtml = data.inlinedHtml;
      await navigator.clipboard.writeText(inlinedHtml);
      showNotification('Inlined HTML copied to clipboard!');
    } catch (err) {
      alert('Error exporting file: ' + err.message);
    }
  },
});




      editor.Commands.add('close-editor', {
        run: () => {
          if (onClose) onClose()
        },
      })

      editor.on('update', () => {
        const html = editor.getHtml()
        if (onHtmlChange) onHtmlChange(html)
      })

      if (!initialHtml && templateName) {
        fetch(`http://localhost:4000/templates/${templateName}`)
          .then(res => res.text())
          .then(html => editor.setComponents(html))
          .catch(err => {
            console.error('Error loading template:', err)
            alert('Could not load template.')
          })
      }
    }
  }, [fileName, templateName, initialHtml, onClose])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const content = await file.text()
    editorInstanceRef.current?.setComponents(content)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* Left Sidebar */}
      <div style={{ width: '250px', background: '#f5f5f5', padding: '10px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <input type="file" accept=".html" onChange={handleFileUpload} />
        </div>
        <div>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Template name"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <button onClick={() => editorInstanceRef.current?.runCommand('save-html')} style={{ width: '100%', padding: '6px' }}>
            Save HTML
          </button>
        </div>
        <div>
          <button onClick={() => editorInstanceRef.current?.runCommand('export-html')} style={{ width: '100%', padding: '6px' }}>
            Export HTML
          </button>
        </div>
        <div>
          <button onClick={() => editorInstanceRef.current?.runCommand('close-editor')} style={{ width: '100%', padding: '6px' }}>
            Close Editor
          </button>
        </div>

        {/* Block Area */}
        <div id="custom-blocks" style={{ flex: 1, overflowY: 'auto', marginTop: '10px' }}></div>
        {/* Template List */}
<div style={{ flex: 1, overflowY: 'auto', marginTop: '10px' }}>
  <h4>Templates</h4>
  <ul style={{ listStyle: 'none', padding: 0 }}>
    {templates.map(template => (
      <li key={template} style={{ marginBottom: '8px' }}>
        <button
          style={{
            width: '100%',
            padding: '6px',
            textAlign: 'left',
            background: '#e0e0e0',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          onClick={() => loadTemplate(template)}
        >
          {template.replace('.html', '')}
        </button>
      </li>
    ))}
  </ul>
</div>

      </div>

      {/* Editor */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={editorRef} style={{ height: '100%' }}></div>
      </div>

      {/* Style Manager */}
      <div id="style-manager" style={{ width: '250px', background: '#f0f0f0', padding: '10px', overflowY: 'auto' }}></div>

      {/* Back Button */}
      {onClose && (
        <button onClick={onClose} style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
          ← Back to Templates
        </button>
      )}
    </div>
  )
}
