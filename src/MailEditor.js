import React, { useState, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Helper function to get initial properties for a new component type
const getInitialComponentProps = (type) => {
  const commonProps = { padding: 10, align: 'left', fontSize: 16 };
  let specificProps = {};

  switch (type) {
    case 'text':
      specificProps = { content: 'This is a text block. <a href="https://example.com">Learn more</a>', bold: false };
      break;
    case 'image':
      specificProps = { src: 'https://placehold.co/300x100/A0B2C3/FFFFFF?text=Placeholder', width: 300, height: 100, borderRadius: 0 };
      break;
    case 'button':
      specificProps = { label: 'Click Me', color: '#007bff', textColor: '#ffffff', buttonPadding: '10px 20px', borderRadius: 5 };
      break;
    case 'list':
      specificProps = { items: ['List Item 1', 'List Item 2', 'List Item 3'], ordered: false };
      break;
    case 'anchor':
      specificProps = { href: 'https://www.example.com', text: 'Link Text', textColor: '#007bff' };
      break;
    default:
      // Fallback for unexpected types
      console.warn(`[getInitialComponentProps] Unknown type received: "${type}". Returning default 'unknown' component.`);
      return { type: 'unknown', ...commonProps, content: `Error: Unknown Component Type: "${type}"` };
  }
  return { type, ...commonProps, ...specificProps }; // Explicitly ensure 'type' is included
};

// ToolboxItem component for draggable elements
const ToolboxItem = ({ type, label }) => {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: 'element',
    item: { type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={dragRef}
      // Adjusted styling for box shape and centering text
      className={`flex items-center justify-center text-center w-24 h-24 bg-white border border-gray-300 rounded-lg shadow-sm cursor-grab m-1
                 ${isDragging ? 'opacity-50' : 'opacity-100'}
                 hover:shadow-md transition-shadow duration-200`}
    >
      {label}
    </div>
  );
};

// Helper function to render text with links from an HTML string
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
      <a key={start} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
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

// Canvas component where elements are dropped and displayed
const Canvas = ({ components, onDrop, onSelect, selectedIndex }) => {
  const [dropIndex, setDropIndex] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'before' or 'after'

  const [, dropRef] = useDrop({
    accept: 'element',
    hover(item, monitor) {
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const items = document.querySelectorAll('.canvas-item');
      let foundIndex = components.length;
      let position = 'before';

      // Determine the precise drop position (before/after an item)
      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        const middleY = rect.top + rect.height / 2;

        if (clientOffset.y < middleY) {
          foundIndex = i;
          position = 'before';
          break;
        } else if (clientOffset.y >= middleY && clientOffset.y <= rect.bottom) {
          foundIndex = i;
          position = 'after';
          break;
        }
      }

      // If dragging below all items, place at the end
      if (foundIndex === components.length && items.length > 0) {
        position = 'after'; // Explicitly after the last item
      } else if (items.length === 0) {
        foundIndex = 0; // If canvas is empty, always insert at index 0
        position = 'before';
      }

      setDropIndex(foundIndex);
      setDropPosition(position);
    },
    drop(item) {
      // Calculate the final insertion index based on hover position
      const insertIndex = dropPosition === 'after' ? dropIndex + 1 : dropIndex;
      onDrop(item, insertIndex);
      setDropIndex(null); // Reset drop indicators
      setDropPosition(null);
    },
  });

  console.log('Canvas rendering. Components:', components, 'Selected Index:', selectedIndex);

  return (
    <div
      ref={dropRef}
      className="min-h-[400px] border-2 border-dashed border-gray-400 p-4 bg-gray-50 relative"
    >
      {components.length === 0 && !dropIndex && (
        <p className="text-center text-gray-500 py-20">Drag and drop elements here</p>
      )}

      {components.map((comp, index) => (
        <React.Fragment key={comp.id || index}> {/* Use unique ID if available, fallback to index */}
          {/* Drop indicator before the element */}
          {dropIndex === index && dropPosition === 'before' && (
            <div className="h-1 bg-blue-500 my-1 rounded-full" />
          )}

          <div
            className={`canvas-item p-1 relative cursor-pointer rounded-md transition-all duration-100 ${selectedIndex === index ? 'border-2 border-blue-600 bg-blue-50' : 'border-2 border-transparent hover:border-blue-300'}`}
            onClick={() => onSelect(index)}
          >
            {(() => {
              // Log the current component being rendered
              console.log(`Rendering component ${index}:`, comp);

              const commonStyle = {
                padding: comp.padding !== undefined ? `${comp.padding}px` : '10px',
                textAlign: comp.align || 'left',
                fontSize: comp.fontSize ? `${comp.fontSize}px` : '16px',
                fontWeight: comp.bold ? 'bold' : 'normal',
              };

              switch (comp.type) {
                case 'text':
                  return (
                    <p style={{ margin: 0, ...commonStyle }}>
                      {renderTextWithLinks(comp.content || 'This is a text block')}
                    </p>
                  );
                case 'image':
                  return (
                    <div style={{ textAlign: comp.align || 'left' }}>
                      <img
                        src={comp.src || 'https://placehold.co/300x100'}
                        alt="placeholder"
                        className="max-w-full"
                        style={{
                          display: (comp.align === 'center' || comp.align === 'right') ? 'inline-block' : 'block', // Allows alignment
                          margin: comp.align === 'center' ? '8px auto' : (comp.align === 'right' ? '8px 0 8px auto' : '8px 0 8px 0'),
                          width: comp.width ? `${comp.width}px` : 'auto',
                          height: comp.height ? `${comp.height}px` : 'auto',
                          borderRadius: comp.borderRadius ? `${comp.borderRadius}px` : '0px',
                          padding: commonStyle.padding, // Image padding
                        }}
                      />
                    </div>
                  );
                case 'list':
                  const ListTag = comp.ordered ? 'ol' : 'ul';
                  return (
                    <ListTag
                      style={{
                        margin: 0,
                        ...commonStyle,
                        listStyleType: comp.ordered ? 'decimal' : 'disc', // For ordered/unordered
                      }}
                      className="pl-5" // Add padding for list markers
                    >
                      {(comp.items && comp.items.length > 0
                        ? comp.items
                        : ['Item 1', 'Item 2', 'Item 3']
                      ).map((item, idx) => (
                        <li key={idx} dangerouslySetInnerHTML={{ __html: item }} />
                      ))}
                    </ListTag>
                  );
                case 'anchor':
                  return (
                    <div style={{ textAlign: comp.align || 'left', padding: commonStyle.padding }}>
                      <a
                        href={comp.href || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: comp.textColor || '#007bff',
                          fontSize: commonStyle.fontSize,
                          fontWeight: commonStyle.fontWeight,
                          textDecoration: 'underline',
                          display: 'inline-block' // Ensures padding/alignment works better
                        }}
                        className="inline-block"
                      >
                        {comp.text || 'Link Text'}
                      </a>
                    </div>
                  );
                case 'button':
                  return (
                    <div style={{ textAlign: comp.align || 'left', padding: commonStyle.padding }}>
                      <button
                        style={{
                          backgroundColor: comp.color || '#007bff',
                          color: comp.textColor || 'white',
                          border: 'none',
                          padding: comp.buttonPadding || '10px 20px', // Use buttonPadding for specific button padding
                          margin: '6px 0',
                          cursor: 'pointer',
                          fontSize: commonStyle.fontSize,
                          fontWeight: commonStyle.fontWeight,
                          borderRadius: comp.borderRadius ? `${comp.borderRadius}px` : '5px',
                          display: 'inline-block' // Ensures alignment works
                        }}
                        className="rounded-md shadow-md hover:opacity-90 transition-opacity"
                      >
                        {comp.label || 'Click Me'}
                      </button>
                    </div>
                  );
                default:
                  // This case should ideally not be hit with getInitialComponentProps handling it
                  return <p style={{ color: 'red' }}>Error: Unknown Component Type</p>;
              }
            })()}
          </div>

          {/* Drop indicator after the element */}
          {dropIndex === index && dropPosition === 'after' && (
            <div className="h-1 bg-blue-500 my-1 rounded-full" />
          )}
        </React.Fragment>
      ))}

      {/* Drop indicator for empty canvas or at the very end */}
      {components.length === 0 && dropIndex === 0 && (
        <div className="h-1 bg-blue-500 my-1 rounded-full absolute top-1/2 left-0 right-0 -translate-y-1/2" />
      )}
      {components.length > 0 && dropIndex === components.length && dropPosition === 'after' && (
        <div className="h-1 bg-blue-500 my-1 rounded-full" />
      )}
    </div>
  );
};

// PropertiesPanel component for editing selected component's properties
const PropertiesPanel = ({ component, onChange, onDelete }) => {
  const handleChange = useCallback((key, type = 'text') => (e) => {
    let value;
    if (type === 'checkbox') {
      value = e.target.checked;
    } else if (type === 'number') {
      value = parseFloat(e.target.value);
      if (isNaN(value)) value = ''; // Allow empty input for numbers
    } else {
      value = e.target.value;
    }
    onChange({ ...component, [key]: value });
  }, [component, onChange]);

  const handleListItemChange = useCallback((index, newValue) => {
    const newItems = [...(component.items || [])];
    newItems[index] = newValue;
    onChange({ ...component, items: newItems });
  }, [component, onChange]);

  const handleAddListItem = useCallback(() => {
    onChange({ ...component, items: [...(component.items || []), `New Item ${ (component.items?.length || 0) + 1}`] });
  }, [component, onChange]);

  const handleRemoveListItem = useCallback((indexToRemove) => {
    onChange({ ...component, items: (component.items || []).filter((_, i) => i !== indexToRemove) });
  }, [component, onChange]);


  if (!component) {
    return (
      <div className="p-4 border-l border-gray-300 w-80 flex-shrink-0 bg-white shadow-inner rounded-md">
        <p className="text-gray-600">Select an element on the canvas to edit its properties.</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-l border-gray-300 w-80 flex-shrink-0 bg-white shadow-inner rounded-md overflow-y-auto">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        Properties: {component && component.type ? (component.type.charAt(0).toUpperCase() + component.type.slice(1)) : 'Selected Element'}
      </h3>

      {/* Common properties for text, button, anchor, list */}
      {(component.type === 'text' || component.type === 'button' || component.type === 'anchor' || component.type === 'list') && (
        <>
          <div className="mb-3">
            <label htmlFor="padding" className="block text-sm font-medium text-gray-700">Padding (px):</label>
            <input
              id="padding"
              type="number"
              value={component.padding !== undefined ? component.padding : ''}
              onChange={handleChange('padding', 'number')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              min="0"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="align" className="block text-sm font-medium text-gray-700">Alignment:</label>
            <select
              id="align"
              value={component.align || 'left'}
              onChange={handleChange('align')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700">Font Size (px):</label>
            <input
              id="fontSize"
              type="number"
              value={component.fontSize !== undefined ? component.fontSize : ''}
              onChange={handleChange('fontSize', 'number')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              min="1"
            />
          </div>
        </>
      )}

      {/* Specific properties for text */}
      {component.type === 'text' && (
        <>
          <div className="mb-3">
            <label htmlFor="textContent" className="block text-sm font-medium text-gray-700">Text Content:</label>
            <textarea
              id="textContent"
              value={component.content || ''}
              onChange={handleChange('content')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-24 resize-y"
            />
          </div>
          <div className="mb-3 flex items-center">
            <input
              id="bold"
              type="checkbox"
              checked={component.bold || false}
              onChange={handleChange('bold', 'checkbox')}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="bold" className="ml-2 block text-sm text-gray-900">Bold</label>
          </div>
        </>
      )}

      {/* Specific properties for image */}
      {component.type === 'image' && (
        <>
          <div className="mb-3">
            <label htmlFor="imageSrc" className="block text-sm font-medium text-gray-700">Image URL:</label>
            <input
              id="imageSrc"
              type="text"
              value={component.src || ''}
              onChange={handleChange('src')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="imageWidth" className="block text-sm font-medium text-gray-700">Width (px):</label>
            <input
              id="imageWidth"
              type="number"
              value={component.width !== undefined ? component.width : ''}
              onChange={handleChange('width', 'number')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              min="1"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="imageHeight" className="block text-sm font-medium text-gray-700">Height (px):</label>
            <input
              id="imageHeight"
              type="number"
              value={component.height !== undefined ? component.height : ''}
              onChange={handleChange('height', 'number')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              min="1"
            />
          </div>
           <div className="mb-3">
            <label htmlFor="align" className="block text-sm font-medium text-gray-700">Alignment:</label>
            <select
              id="align"
              value={component.align || 'left'}
              onChange={handleChange('align')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="borderRadius" className="block text-sm font-medium text-gray-700">Border Radius (px):</label>
            <input
              id="borderRadius"
              type="number"
              value={component.borderRadius !== undefined ? component.borderRadius : ''}
              onChange={handleChange('borderRadius', 'number')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              min="0"
            />
          </div>
        </>
      )}

      {/* Specific properties for button */}
      {component.type === 'button' && (
        <>
          <div className="mb-3">
            <label htmlFor="buttonLabel" className="block text-sm font-medium text-gray-700">Button Label:</label>
            <input
              id="buttonLabel"
              type="text"
              value={component.label || ''}
              onChange={handleChange('label')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="buttonColor" className="block text-sm font-medium text-gray-700">Background Color:</label>
            <input
              id="buttonColor"
              type="color"
              value={component.color || '#007bff'}
              onChange={handleChange('color')}
              className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm p-1"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="buttonTextColor" className="block text-sm font-medium text-gray-700">Text Color:</label>
            <input
              id="buttonTextColor"
              type="color"
              value={component.textColor || '#ffffff'}
              onChange={handleChange('textColor')}
              className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm p-1"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="buttonPadding" className="block text-sm font-medium text-gray-700">Button Padding (e.g., "10px 20px"):</label>
            <input
              id="buttonPadding"
              type="text"
              value={component.buttonPadding || '10px 20px'}
              onChange={handleChange('buttonPadding')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="buttonBorderRadius" className="block text-sm font-medium text-gray-700">Border Radius (px):</label>
            <input
              id="buttonBorderRadius"
              type="number"
              value={component.borderRadius !== undefined ? component.borderRadius : ''}
              onChange={handleChange('borderRadius', 'number')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              min="0"
            />
          </div>
        </>
      )}

      {/* Specific properties for list */}
      {component.type === 'list' && (
        <>
          <div className="mb-3 flex items-center">
            <input
              id="orderedList"
              type="checkbox"
              checked={component.ordered || false}
              onChange={handleChange('ordered', 'checkbox')}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="orderedList" className="ml-2 block text-sm text-gray-900">Ordered List</label>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700">List Items:</label>
            {(component.items || []).map((item, index) => (
              <div key={index} className="flex items-center mt-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleListItemChange(index, e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm p-2 flex-grow"
                />
                <button
                  onClick={() => handleRemoveListItem(index)}
                  className="ml-2 px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              onClick={handleAddListItem}
              className="mt-3 w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              Add Item
            </button>
          </div>
        </>
      )}

      {/* Specific properties for anchor */}
      {component.type === 'anchor' && (
        <>
          <div className="mb-3">
            <label htmlFor="anchorText" className="block text-sm font-medium text-gray-700">Link Text:</label>
            <input
              id="anchorText"
              type="text"
              value={component.text || ''}
              onChange={handleChange('text')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="anchorHref" className="block text-sm font-medium text-gray-700">URL (href):</label>
            <input
              id="anchorHref"
              type="text"
              value={component.href || ''}
              onChange={handleChange('href')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="anchorTextColor" className="block text-sm font-medium text-gray-700">Text Color:</label>
            <input
              id="anchorTextColor"
              type="color"
              value={component.textColor || '#007bff'}
              onChange={handleChange('textColor')}
              className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm p-1"
            />
          </div>
        </>
      )}

      <button
        onClick={onDelete}
        className="mt-6 w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-md"
      >
        Delete Element
      </button>
    </div>
  );
};

const EmailBuilder = () => {
  const [components, setComponents] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-generate unique IDs for components
  const nextId = React.useRef(0);
  React.useEffect(() => {
    // Ensure IDs are unique, especially if components state is reinitialized
    nextId.current = components.length > 0 ? Math.max(...components.map(c => c.id || 0)) + 1 : 0;
  }, [components]);


  const handleDrop = useCallback((item, index) => {
    setComponents((prev) => {
      // Ensure item.type is a string and valid, fallback to 'unknown'
      const componentType = typeof item.type === 'string' ? item.type : 'unknown';
      console.log('[handleDrop] Dropped item type:', componentType); // Debug log

      const newItem = {
        id: nextId.current++, // Assign a unique ID
        ...getInitialComponentProps(componentType)
      };
      console.log('[handleDrop] New item created:', newItem); // Debug log

      const newComponents = [...prev];
      newComponents.splice(index, 0, newItem);
      return newComponents;
    });
    // Automatically select the newly dropped item
    setSelectedIndex(index);
  }, [nextId]);

  const handleSelect = useCallback((index) => {
    setSelectedIndex(index);
  }, []);

  const handlePropertyChange = useCallback((newProps) => {
    setComponents((prev) => {
      const newComponents = [...prev];
      newComponents[selectedIndex] = newProps;
      return newComponents;
    });
  }, [selectedIndex]);

  const handleDelete = useCallback(() => {
    if (selectedIndex === null) return;
    setComponents((prev) => {
      const newComponents = [...prev];
      newComponents.splice(selectedIndex, 1);
      return newComponents;
    });
    setSelectedIndex(null); // Deselect after deleting
  }, [selectedIndex]);

const generateEmailHtmlForComponents = useCallback((comps) => {
    return comps.map((comp) => {
      // Common styles for table cell
      const cellPadding = comp.padding !== undefined ? `${comp.padding}px` : '10px';
      const textAlign = comp.align || 'left';

      // Common font styles for text, button, anchor, list
      const fontSize = comp.fontSize ? `${comp.fontSize}px` : '16px';
      const fontWeight = comp.bold ? 'bold' : 'normal';
      const lineHeight = comp.lineHeight ? `${comp.lineHeight}px` : '24px';
      const textColor = comp.textColor || '#333333';

      let contentHtml = '';

      switch (comp.type) {
        case 'text':
          contentHtml = `<p style="margin:0; padding:0; font-size:${fontSize}; line-height:${lineHeight}; color:${textColor}; font-weight:${fontWeight};">${comp.content || 'This is a text block'}</p>`;
          break;
        case 'image':
          const imageAlign = comp.align === 'center' ? 'display:block; margin:0 auto;' : (comp.align === 'right' ? 'display:block; margin:0 0 0 auto;' : 'display:block;');
          const imageWidth = comp.width ? `width:${comp.width}px;` : 'width:auto;';
          const imageHeight = comp.height ? `height:${comp.height}px;` : 'height:auto;';
          const borderRadius = comp.borderRadius ? `border-radius:${comp.borderRadius}px;` : 'border-radius:0px;';
          contentHtml = `<img src="${comp.src || 'https://placehold.co/300x100'}" alt="${comp.alt || ''}" width="${comp.width || ''}" height="${comp.height || ''}" style="${imageAlign} max-width:100%; ${imageWidth} ${imageHeight} ${borderRadius} outline:none; text-decoration:none;" />`;
          break;
        case 'list':
          const listTag = comp.ordered ? 'ol' : 'ul';
          const listStyleType = comp.ordered ? 'decimal' : 'disc';
          const listItems = (comp.items && comp.items.length > 0 ? comp.items : ['Item 1', 'Item 2', 'Item 3'])
            .map((item) => `<li style="margin-bottom:5px; color:${textColor};">${item}</li>`)
            .join('');
          contentHtml = `<${listTag} style="margin:0; padding-left:25px; list-style-type:${listStyleType}; font-size:${fontSize}; line-height:${lineHeight}; color:${textColor}; font-weight:${fontWeight};">${listItems}</${listTag}>`;
          break;
        case 'anchor':
          contentHtml = `<a href="${comp.href || '#'}" target="_blank" style="color:${comp.textColor || '#007bff'}; font-size:${fontSize}; font-weight:${fontWeight}; text-decoration:${comp.textDecoration || 'underline'}; display:inline-block;">${comp.text || 'Link Text'}</a>`;
          break;
        case 'button':
          contentHtml = `
            <table border="0" cellspacing="0" cellpadding="0" style="margin:6px 0; border-collapse:collapse;">
              <tr>
                <td align="${textAlign}" style="padding:0;">
                  <a href="${comp.href || '#'}" target="_blank"
                    style="background-color:${comp.color || '#007bff'}; color:${comp.textColor || '#ffffff'}; padding:${comp.buttonPadding || '10px 20px'}; text-decoration:none; border-radius:${comp.borderRadius || '4'}px; font-size:${fontSize}; font-weight:${fontWeight}; display:inline-block; mso-padding-alt:0px; /* Outlook fix */">
                    ${comp.label || 'Click Me'}
                  </a>
                </td>
              </tr>
            </table>
          `;
          break;
        case 'two-column-block':
          const blockBgColor = comp.backgroundColor || '#f0f0f0';
          const blockPadding = comp.padding !== undefined ? `${comp.padding}px` : '20px';
          const leftColumnHtml = generateEmailHtmlForComponents(comp.columns.left);
          const rightColumnHtml = generateEmailHtmlForComponents(comp.columns.right);

          return `
            <!-- Two Column Block -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background-color:${blockBgColor};">
                <tr>
                    <td style="padding:${blockPadding};">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                            <tr>
                                <td width="50%" valign="top" style="padding-right:5px; /* Spacing between columns */">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                                        ${leftColumnHtml}
                                    </table>
                                </td>
                                <td width="50%" valign="top" style="padding-left:5px; /* Spacing between columns */">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                                        ${rightColumnHtml}
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            <!-- End Two Column Block -->
          `;
        default:
          return `<!-- Unknown Component Type: ${comp.type} -->`;
      }
      
      // Wrap content in a table row/cell for general components
      return `
        <tr>
          <td align="${textAlign}" style="padding:${cellPadding};">
            ${contentHtml}
          </td>
        </tr>
      `;

    }).join('\n');
  }, []);

 const exportHTML = useCallback(() => {
    const mainContentHtml = generateEmailHtmlForComponents(components);

    const fullHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Email Template</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style type="text/css">
      /* CLIENT-SPECIFIC STYLES */
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; }
      /* RESET STYLES */
      img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      table { border-collapse: collapse !important; }
      body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
      /* iOS blue links */
      a[x-apple-data-detectors] {
        color: inherit !important;
        text-decoration: none !important;
        font-size: inherit !important;
        font-family: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
      }
      /* Outlook link fix */
      #outlook a { padding: 0; }
      .ExternalClass { width: 100%; }
      .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
      /* Mobile responsiveness */
      @media screen and (max-width: 599px) {
        .wrapper { width: 100% !important; }
        .column { width: 100% !important; display: block !important; }
        .mobile-padding { padding: 10px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse:collapse; background-color:#ffffff; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
      <!-- Optional Preheader Text (Hidden) -->
      <tr>
        <td style="display:none;font-size:1px;color:#f4f4f4;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
          ${(components[0] && components[0].type === 'text') ? components[0].content.replace(/<[^>]*>?/gm, '').substring(0, 100) : 'Your email preheader text'}
        </td>
      </tr>
      <!-- Email Content Rows -->
      ${mainContentHtml}
      <!-- Footer (Example - you can build this with components) -->
      <tr>
        <td align="center" bgcolor="#f4f4f4" style="padding: 10px; font-size: 12px; color: #aaaaaa; font-family: Arial, sans-serif;">
          &copy; 2025 Your Company. All rights reserved.
        </td>
      </tr>
    </table>
    <!-- Open Tracker Image -->
    <img
      src="https://track.techresearchcenter.com/track/open?email={{email}}&campaign_id={{campaignId}}&subject={{subject}}&sent_at={{sentAt}}"
      width="1"
      height="1"
      style="display: block; max-width: 1px; min-height: 1px; opacity: 0; overflow: hidden; margin:0; padding:0; font-size:0px; line-height:0px;"
      alt="open-tracker"
      loading="eager"
      referrerpolicy="no-referrer"
    />
  </body>
</html>`;

    const textArea = document.createElement("textarea");
    textArea.value = fullHtml;
    textArea.style.position = "fixed"; // Avoid scrolling to bottom
    textArea.style.left = "-9999px"; // Move off-screen
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
    } catch (copyErr) {
      console.error('Failed to copy HTML using execCommand:', copyErr);
      alert('Failed to copy HTML. Please manually copy from console.');
    } finally {
      document.body.removeChild(textArea);
    }
  }, [components, generateEmailHtmlForComponents]);

  console.log('EmailBuilder rendering. Components:', components, 'Selected Index:', selectedIndex);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col md:flex-row gap-5 p-5 min-h-screen bg-gray-100 font-inter">
        {/* Toolbox */}
        <div className="w-full md:w-56 flex-shrink-0 bg-white p-4 rounded-md shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Toolbox</h3>
          {/* Apply grid layout to toolbox items */}
          <div className="grid grid-cols-2 gap-2">
            <ToolboxItem type="text" label="Text Block" />
            <ToolboxItem type="image" label="Image" />
            <ToolboxItem type="button" label="Button" />
            <ToolboxItem type="list" label="List" />
            <ToolboxItem type="anchor" label="Link" />
          </div>
        </div>

        {/* Email canvas */}
        <div className="flex-grow bg-white p-4 rounded-md shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Email Canvas</h3>
          <Canvas
            components={components}
            onDrop={handleDrop}
            onSelect={handleSelect}
            selectedIndex={selectedIndex}
          />
          <button
            onClick={exportHTML}
            className={`mt-4 w-full px-4 py-2 rounded-md transition-colors ${copied ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-md`}
          >
            {copied ? 'Copied!' : 'Export HTML'}
          </button>
        </div>

        {/* Properties panel */}
        <PropertiesPanel
          component={selectedIndex !== null ? components[selectedIndex] : null}
          onChange={handlePropertyChange}
          onDelete={handleDelete}
        />
      </div>
    </DndProvider>
  );
};

export default EmailBuilder;