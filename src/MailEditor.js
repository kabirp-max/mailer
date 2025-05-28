import React, { useState } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

// ToolboxItem (unchanged)
const ToolboxItem = ({ type, label }) => {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: 'element',
    item: { type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))
  return (
    <div
      ref={dragRef}
      style={{
        padding: '8px',
        marginBottom: '6px',
        backgroundColor: 'white',
        border: '1px solid #ccc',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
      }}
    >
      {label}
    </div>
  )
}

const Canvas = ({ components, onDrop, onSelect, selectedIndex }) => {
  const [dropIndex, setDropIndex] = React.useState(null)
  const [dropPosition, setDropPosition] = React.useState(null) // 'before' or 'after'

  const [, dropRef] = useDrop({
    accept: 'element',
    hover(_, monitor) {
      const clientOffset = monitor.getClientOffset()
      if (!clientOffset) return

      const items = document.querySelectorAll('.canvas-item')
      let foundIndex = components.length
      let position = 'before'

      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect()
        const middleY = rect.top + rect.height / 2

        if (clientOffset.y < middleY) {
          foundIndex = i
          position = 'before'
          break
        } else if (clientOffset.y >= middleY && clientOffset.y <= rect.bottom) {
          foundIndex = i
          position = 'after'
          break
        }
      }

      if (foundIndex === components.length) {
        position = 'before'
      }

      setDropIndex(foundIndex)
      setDropPosition(position)
    },
    drop(item) {
      if (dropIndex === null) {
        onDrop(item, components.length)
      } else {
        const insertIndex = dropPosition === 'after' ? dropIndex + 1 : dropIndex
        onDrop(item, insertIndex)
      }
      setDropIndex(null)
      setDropPosition(null)
    },
  })

  return (
    <div
      ref={dropRef}
      style={{
        minHeight: 400,
        border: '2px dashed #aaa',
        padding: 16,
        backgroundColor: '#fefefe',
      }}
    >
      {components.map((comp, index) => (
        <React.Fragment key={index}>
          {/* Drop indicators */}
          {dropIndex === index && dropPosition === 'before' && (
            <div style={{ height: 4, backgroundColor: 'blue', margin: '4px 0' }} />
          )}

          <div
            className="canvas-item"
            style={{
              padding: '4px 0',
              cursor: 'pointer',
              border: selectedIndex === index ? '2px solid #007bff' : 'none',
              backgroundColor: selectedIndex === index ? '#e6f0ff' : 'transparent',
            }}
            onClick={() => onSelect(index)}
          >
            {(() => {
              switch (comp.type) {
                case 'text':
                  return <p style={{ margin: 0 }}>{comp.content || 'This is a text block'}</p>
                case 'image':
                  return (
                    <img
                      src={comp.src || 'https://via.placeholder.com/300x100'}
                      alt="placeholder"
                      style={{ display: 'block', margin: '8px 0', maxWidth: '100%' }}
                    />
                  )
                case 'button':
                  return (
                    <button
                      style={{
                        padding: '10px 20px',
                        backgroundColor: comp.color || '#007bff',
                        color: comp.textColor || 'white',
                        border: 'none',
                        margin: '6px 0',
                        cursor: 'pointer',
                      }}
                    >
                      {comp.label || 'Click Me'}
                    </button>
                  )
                default:
                  return null
              }
            })()}
          </div>

          {dropIndex === index && dropPosition === 'after' && (
            <div style={{ height: 4, backgroundColor: 'blue', margin: '4px 0' }} />
          )}
        </React.Fragment>
      ))}
      {dropIndex === components.length && (
        <div style={{ height: 4, backgroundColor: 'blue', margin: '4px 0' }} />
      )}
    </div>
  )
}

const PropertiesPanel = ({ component, onChange, onDelete }) => {
  if (!component) {
    return (
      <div style={{ padding: 16 }}>
        <p>Select an element to see properties</p>
      </div>
    )
  }

  // Helper for text input change
  const handleChange = (key) => (e) => {
    onChange({ ...component, [key]: e.target.value })
  }

  return (
    <div style={{ padding: 16, borderLeft: '1px solid #ccc', width: 300 }}>
      <h3>Properties</h3>

      {component.type === 'text' && (
        <>
          <label>
            Text Content:
            <textarea
              value={component.content || ''}
              onChange={handleChange('content')}
              style={{ width: '100%', height: 80, marginTop: 4 }}
            />
          </label>
        </>
      )}

      {component.type === 'image' && (
        <>
          <label>
            Image URL:
            <input
              type="text"
              value={component.src || ''}
              onChange={handleChange('src')}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
        </>
      )}

      {component.type === 'button' && (
        <>
          <label>
            Label:
            <input
              type="text"
              value={component.label || ''}
              onChange={handleChange('label')}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          <label>
            Background Color:
            <input
              type="color"
              value={component.color || '#007bff'}
              onChange={handleChange('color')}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          <label>
            Text Color:
            <input
              type="color"
              value={component.textColor || '#ffffff'}
              onChange={handleChange('textColor')}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
        </>
      )}

      <button
        onClick={onDelete}
        style={{
          marginTop: 20,
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          padding: '10px',
          width: '100%',
          cursor: 'pointer',
        }}
      >
        Delete Element
      </button>
    </div>
  )
}

const EmailBuilder = () => {
  const [components, setComponents] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(null)

  const handleDrop = (item, index) => {
    setComponents((prev) => {
      const newComponents = [...prev]
      // Add default properties depending on type
      let newItem = { type: item.type }
      switch (item.type) {
        case 'text':
          newItem.content = 'This is a text block'
          break
        case 'image':
          newItem.src = 'https://via.placeholder.com/300x100'
          break
        case 'button':
          newItem.label = 'Click Me'
          newItem.color = '#007bff'
          newItem.textColor = '#ffffff'
          break
      }
      newComponents.splice(index, 0, newItem)
      return newComponents
    })
  }

  const handleSelect = (index) => {
    setSelectedIndex(index)
  }

  const handlePropertyChange = (newProps) => {
    setComponents((prev) => {
      const newComponents = [...prev]
      newComponents[selectedIndex] = newProps
      return newComponents
    })
  }

  const handleDelete = () => {
    if (selectedIndex === null) return
    setComponents((prev) => {
      const newComponents = [...prev]
      newComponents.splice(selectedIndex, 1)
      return newComponents
    })
    setSelectedIndex(null)
  }

  const exportHTML = () => {
    const html = components
      .map((comp) => {
        switch (comp.type) {
          case 'text':
            return `<p>${comp.content || 'This is a text block'}</p>`
          case 'image':
            return `<img src="${comp.src || 'https://via.placeholder.com/300x100'}" alt="placeholder" />`
          case 'button':
            return `<button style="padding:10px 20px; background-color:${
              comp.color || '#007bff'
            }; color:${comp.textColor || '#ffffff'}; border:none;">${
              comp.label || 'Click Me'
            }</button>`
          default:
            return ''
        }
      })
      .join('\n')
    alert(html)
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        style={{
          display: 'flex',
          gap: 20,
          padding: 20,
          height: '100vh',
          boxSizing: 'border-box',
        }}
      >
        {/* Toolbox */}
        <div style={{ width: 200 }}>
          <h3>Toolbox</h3>
          <ToolboxItem type="text" label="Text" />
          <ToolboxItem type="image" label="Image" />
          <ToolboxItem type="button" label="Button" />
        </div>

        {/* Email canvas */}
        <div style={{ flexGrow: 1 }}>
          <h3>Email Canvas</h3>
          <Canvas
            components={components}
            onDrop={handleDrop}
            onSelect={handleSelect}
            selectedIndex={selectedIndex}
          />
          <button onClick={exportHTML} style={{ marginTop: 20 }}>
            Export HTML
          </button>
        </div>

        {/* Properties panel */}
        <PropertiesPanel
          component={components[selectedIndex]}
          onChange={handlePropertyChange}
          onDelete={handleDelete}
        />
      </div>
    </DndProvider>
  )
}

export default EmailBuilder
