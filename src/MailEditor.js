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

const renderTextWithLinks = (content = '') => {
  const regex = /<a href="(.*?)">(.*?)<\/a>/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const [fullMatch, href, linkText] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(content.slice(lastIndex, start));
    }

    parts.push(
      <a key={start} href={href} target="_blank" rel="noopener noreferrer">
        {linkText}
      </a>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
};


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
        const commonStyle = {
          padding: comp.padding !== undefined ? `${comp.padding}px` : '10px',

          textAlign: comp.align || 'left',
          fontSize: comp.fontSize || '16px',
          
        };

        switch (comp.type) {
          case 'text':
            return (
              <p
                style={{
                  margin: 0,
                  fontWeight: comp.bold ? 'bold' : 'normal',
                  ...commonStyle,
                }}
              >
                {renderTextWithLinks(comp.content || 'This is a text block')}
              </p>
            );
          case 'image':
            return (
              <img
                src={comp.src || 'https://via.placeholder.com/300x100'}
                alt="placeholder"
                style={{
                  display: 'block',
                  margin: '8px 0',
                  maxWidth: '100%',
                  width: comp.width+'px' || 'auto',
          height: comp.height+'px' || 'auto',
          borderRadius : comp.borderRadius+'px' || '1px',
                  ...commonStyle,
                }}
              />
            );
           case 'list':
  return (
    <ul
      style={{
        margin: 0,
        fontWeight: comp.bold ? 'bold' : 'normal',
        ...commonStyle,
      }}
    >
      {(comp.items && comp.items.length > 0
        ? comp.items
        : ['Item One', 'Item Two', 'Item Three']
      ).map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  );

            case 'anchor':
              return (
                <a href='#'>Link</a>
              )
          case 'button':
            return (
              <button
                style={{
                  ...commonStyle,
                  backgroundColor: comp.color || '#007bff',
                  color: comp.textColor || 'white',
                  border: 'none',
                  padding: comp.padding|| '10px',
                  margin: '6px 0',
                  cursor: 'pointer',
                }}
              >
                {comp.label || 'Click Me'}
              </button>
            );
          default:
            return null;
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
    );
  }

  const handleChange = (key, type = 'text') => (e) => {
    const value = type === 'checkbox' ? e.target.checked : e.target.value;
    onChange({ ...component, [key]: value });
  };

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

          <label>
  Padding:
  <input
    type="text"
    value={component.padding || '10px'}
    onChange={handleChange('padding')}
    style={{ width: '100%', marginTop: 4 }}
  />
</label>

<label>
  Text Align:
  <select
    value={component.align || 'left'}
    onChange={handleChange('align')}
    style={{ width: '100%', marginTop: 4 }}
  >
    <option value="left">Left</option>
    <option value="center">Center</option>
    <option value="right">Right</option>
  </select>

  <label>
    Font Size:
    <input
      type="text"
      value={component.fontSize || '16px'}
      onChange={handleChange('fontSize')}
      style={{ width: '100%', marginTop: 4 }}
    />
  </label>  
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
  <label>
  Padding:
  <input
    type="number"
    value={component.padding || '10'}
    onChange={handleChange('padding')}
    style={{ width: '100%', marginTop: 4 }}
  />
</label>

  <label>
  Border Radius:
  <input
    type="number"
    value={component.borderRadius || '10'}
    onChange={handleChange('borderRadius')}
    style={{ width: '100%', marginTop: 4 }}
  />
</label>

{/*  */}


          <label>
  Height:
  <input
    type="number"
    value={component.height || '10'}
    onChange={handleChange('height')}
    style={{ width: '100%', marginTop: 4 }}
  />
</label>

<label>
  Width:
  <input
    type="number"
    value={component.width || '10'}
    onChange={handleChange('width')}
    style={{ width: '100%', marginTop: 4 }}
  />
</label>

<label>
  Text Align:
  <select
    value={component.align || 'left'}
    onChange={handleChange('align')}
    style={{ width: '100%', marginTop: 4 }}
  >
    <option value="left">Left</option>
    <option value="center">Center</option>
    <option value="right">Right</option>
  </select>
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

          <label>
  Padding:
  <input
    type="text"
    value={component.padding || '10px'}
    onChange={handleChange('padding')}
    style={{ width: '100%', marginTop: 4 }}
  />
</label>

<label>
  Text Align:
  <select
    value={component.align || 'left'}
    onChange={handleChange('align')}
    style={{ width: '100%', marginTop: 4 }}
  >
    <option value="left">Left</option>
    <option value="center">Center</option>
    <option value="right">Right</option>
  </select>
</label>

{(component.type === 'text' || component.type === 'button') && (
  <label>
    Font Size:
    <input
      type="text"
      value={component.fontSize || '16px'}
      onChange={handleChange('fontSize')}
      style={{ width: '100%', marginTop: 4 }}
    />
  </label>
)}

        </>
      )}

     {component.type === 'list' && (
  <>
    <label>No of Items</label>
    <input
      type="number"
      value={component.items?.length || 3}
      onChange={(e) => {
        const count = parseInt(e.target.value) || 0;  
        const newItems = Array.from({ length: count }, (_, i) => `Item ${i + 1}`);
        // Bypass handleChange and call onChange directly with updated items array
        onChange({ ...component, items: newItems });
      }}
    />
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
    let newItem = { type: item.type, padding: '10px', align: 'left' }

    switch (item.type) {
      case 'text':
        newItem.content = 'This is a text block'
        newItem.fontSize = '16px'
        break
      case 'image':
        newItem.src = 'https://via.placeholder.com/300x100'
        break
      case 'list':
        newItem.content = 'This is a text block'
        newItem.fontSize = '16px'
        break
      case 'button':
        newItem.label = 'Click Me'
        newItem.color = '#007bff'
        newItem.textColor = '#ffffff'
        newItem.fontSize = '16px'
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
          case 'list':
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
      console.log(html);
      
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
          <ToolboxItem type="list" label="List" />
          <ToolboxItem type="anchor" label="Anchor" />
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

/*



*/