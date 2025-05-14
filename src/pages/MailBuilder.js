'use client'

import React, { useEffect, useRef } from 'react'
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'

export default function EmailBuilder() {
  const editorRef = useRef(null)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '' // Clear previous instances

      grapesjs.init({
        container: editorRef.current,
        height: '100vh',
        width: 'auto',
        fromElement: false,
        storageManager: false,
        plugins: [],
        blockManager: {
          appendTo: '#blocks',
        },
        panels: {
          defaults: [
            {
              id: 'commands',
              buttons: [
                {
                  id: 'show-json',
                  className: 'btn-show-json',
                  label: 'Export',
                  command: 'show-json',
                },
              ],
            },
          ],
        },
      })

      const editor = grapesjs.editors[0]

      // Add default blocks (text, image, etc.)
      editor.BlockManager.add('section', {
        label: 'Section',
        category: 'Basic',
        content: '<section class="my-section"><h1>Section Title</h1></section>',
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

      editor.BlockManager.add('2-columns', {
        label: '2 Columns',
        category: 'Basic',
        content: `
          <div class="row" style="display: flex;">
            <div class="column" style="flex: 1; padding: 10px;">Left</div>
            <div class="column" style="flex: 1; padding: 10px;">Right</div>
          </div>
        `,
      })

      // Optional: Custom export command
      editor.Commands.add('show-json', {
        run: function (editor) {
          const html = editor.getHtml()
          const css = editor.getCss()
          alert('HTML Output:\n' + html)
          console.log('CSS:', css)
        },
      })
    }
  }, [])

  return (
    <div className="grapesjs-editor">
      <div id="blocks" style={{ padding: '10px', background: '#f5f5f5' }}></div>
      <div ref={editorRef}></div>
    </div>
  )
}
