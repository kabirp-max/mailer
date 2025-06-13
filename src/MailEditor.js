import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Helper function to get initial properties for a new component type
const getInitialComponentProps = (type) => {
    // Note: Common props like padding, align, fontSize, textColor are handled at the component level
    // and overridden by specific props where necessary.
    let specificProps = {};

    switch (type) {
        case 'text':
            specificProps = { content: 'This is a text block. <a href="https://example.com">Learn more</a>', bold: false, padding: 10, align: 'left', fontSize: 16, textColor: '#333333' };
            break;
        case 'image':
            specificProps = { src: 'https://placehold.co/300x100/A0B2C3/FFFFFF?text=Placeholder', alt: 'Placeholder Image', width: 300, height: 100, borderRadius: 0, align: 'center', padding: 10 };
            break;
        case 'button':
            specificProps = { label: 'Click Me', href: '#', color: '#007bff', textColor: '#ffffff', buttonPadding: '10px 20px', borderRadius: 5, align: 'center', padding: 10, fontSize: 16 };
            break;
        case 'list':
            specificProps = { items: ['List Item 1', 'List Item 2', 'List Item 3'], ordered: false, padding: 10, align: 'left', fontSize: 16, textColor: '#333333' };
            break;
        case 'anchor':
            specificProps = { href: 'https://www.example.com', text: 'Link Text', textColor: '#007bff', textDecoration: 'underline', padding: 10, align: 'left', fontSize: 16 };
            break;
        case 'two-column-block':
            specificProps = {
                backgroundColor: '#f0f0f0',
                padding: 20,
                columns: {
                    left: [], // Nested components for left column
                    right: [], // Nested components for right column
                }
            };
            break;
        default:
            console.warn(`[getInitialComponentProps] Unknown type received: "${type}". Returning default 'unknown' component.`);
            return { type: 'unknown', content: `Error: Unknown Component Type: "${type}"` };
    }
    return { type, ...specificProps };
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
            className={`flex items-center justify-center text-center w-24 h-24 bg-white border border-gray-300 rounded-lg shadow-sm cursor-grab m-1
                     ${isDragging ? 'opacity-50' : 'opacity-100'}
                     hover:shadow-md transition-shadow duration-200`}
        >
            {label}
        </div>
    );
};

// Helper function to render text with links from an HTML string for React display
const renderTextWithLinks = (content = '') => {
    const parts = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${content}</div>`, 'text/html');
    const div = doc.body.firstChild;

    if (!div) return content;

    Array.from(div.childNodes).forEach((node, index) => {
        if (node.nodeType === Node.TEXT_NODE) {
            parts.push(node.textContent);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A') {
            parts.push(
                <a key={index} href={node.getAttribute('href') || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    {node.textContent}
                </a>
            );
        } else {
            // For any other unexpected HTML, render its outerHTML, but be cautious with XSS
            // For a builder, this is generally safe if the input is controlled.
            parts.push(<span key={index} dangerouslySetInnerHTML={{ __html: node.outerHTML }} />);
        }
    });

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

            if (foundIndex === components.length && items.length > 0) {
                position = 'after';
            } else if (items.length === 0) {
                foundIndex = 0;
                position = 'before';
            }

            setDropIndex(foundIndex);
            setDropPosition(position);
        },
        drop(item) {
            const insertIndex = dropPosition === 'after' ? dropIndex + 1 : dropIndex;
            onDrop(item, insertIndex);
            setDropIndex(null);
            setDropPosition(null);
        },
    });

    return (
        <div
            ref={dropRef}
            className="min-h-[400px] border-2 border-dashed border-gray-400 p-4 bg-gray-50 relative"
        >
            {components.length === 0 && !dropIndex && (
                <p className="text-center text-gray-500 py-20">Drag and drop elements here</p>
            )}

            {components.map((comp, index) => (
                <React.Fragment key={comp.id || index}>
                    {dropIndex === index && dropPosition === 'before' && (
                        <div className="h-1 bg-blue-500 my-1 rounded-full" />
                    )}

                    <div
                        className={`canvas-item p-1 relative cursor-pointer rounded-md transition-all duration-100 ${selectedIndex === index ? 'border-2 border-blue-600 bg-blue-50' : 'border-2 border-transparent hover:border-blue-300'}`}
                        onClick={() => onSelect(index)}
                    >
                        {(() => {
                            // Common styles (can be overridden by specific component styles)
                            const commonStyle = {
                                padding: comp.padding !== undefined ? `${comp.padding}px` : '10px',
                                textAlign: comp.align || 'left',
                                fontSize: comp.fontSize ? `${comp.fontSize}px` : '16px',
                                fontWeight: comp.bold ? 'bold' : 'normal',
                                color: comp.textColor || '#333333'
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
                                        <div style={{ textAlign: comp.align || 'left', padding: commonStyle.padding }}>
                                            <img
                                                src={comp.src || 'https://placehold.co/300x100'}
                                                alt={comp.alt || 'placeholder'}
                                                className="max-w-full"
                                                style={{
                                                    display: (comp.align === 'center' || comp.align === 'right') ? 'inline-block' : 'block',
                                                    margin: comp.align === 'center' ? '0 auto' : (comp.align === 'right' ? '0 0 0 auto' : '0'),
                                                    width: comp.width ? `${comp.width}px` : 'auto',
                                                    height: comp.height ? `${comp.height}px` : 'auto',
                                                    borderRadius: comp.borderRadius ? `${comp.borderRadius}px` : '0px',
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
                                                paddingLeft: '25px', // Consistent padding for lists
                                                listStyleType: comp.ordered ? 'decimal' : 'disc',
                                                fontSize: commonStyle.fontSize,
                                                fontWeight: commonStyle.fontWeight,
                                                color: commonStyle.color,
                                                textAlign: commonStyle.textAlign, // Apply to list container
                                                padding: commonStyle.padding, // Ensure padding is applied to the list container itself
                                            }}
                                            className="pl-5"
                                        >
                                            {(comp.items && comp.items.length > 0
                                                ? comp.items
                                                : ['Item 1', 'Item 2', 'Item 3']
                                            ).map((item, idx) => (
                                                <li key={idx} style={{ marginBottom: '5px' }} dangerouslySetInnerHTML={{ __html: item }} />
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
                                                    textDecoration: comp.textDecoration || 'underline',
                                                    display: 'inline-block'
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
                                                    padding: comp.buttonPadding || '10px 20px',
                                                    margin: '6px 0',
                                                    cursor: 'pointer',
                                                    fontSize: commonStyle.fontSize,
                                                    fontWeight: commonStyle.fontWeight,
                                                    borderRadius: comp.borderRadius ? `${comp.borderRadius}px` : '5px',
                                                    display: 'inline-block'
                                                }}
                                                className="rounded-md shadow-md hover:opacity-90 transition-opacity"
                                            >
                                                {comp.label || 'Click Me'}
                                            </button>
                                        </div>
                                    );
                                case 'two-column-block':
                                    return (
                                        <div
                                            style={{
                                                backgroundColor: comp.backgroundColor || '#f0f0f0',
                                                padding: `${comp.padding}px`,
                                                display: 'flex',
                                                gap: '10px',
                                                flexWrap: 'wrap'
                                            }}
                                        >
                                            <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                                                <Canvas
                                                    components={comp.columns.left}
                                                    onDrop={onDrop}
                                                    onSelect={onSelect}
                                                    selectedIndex={selectedIndex}
                                                />
                                            </div>
                                            <div style={{ flex: '1 1 48%', minWidth: '200px' }}>
                                                <Canvas
                                                    components={comp.columns.right}
                                                    onDrop={onDrop}
                                                    onSelect={onSelect}
                                                    selectedIndex={selectedIndex}
                                                />
                                            </div>
                                        </div>
                                    );
                                default:
                                    return <p style={{ color: 'red' }}>Error: Unknown Component Type</p>;
                            }
                        })()}
                    </div>

                    {dropIndex === index && dropPosition === 'after' && (
                        <div className="h-1 bg-blue-500 my-1 rounded-full" />
                    )}
                </React.Fragment>
            ))}

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
            if (isNaN(value)) value = '';
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
        onChange({ ...component, items: [...(component.items || []), `New Item ${(component.items?.length || 0) + 1}`] });
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

            {(component.type !== 'two-column-block') && ( // Common properties for single blocks
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
                    {component.type !== 'image' && ( // Alignment for text, button, anchor, list
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
                    )}
                    {(component.type === 'text' || component.type === 'anchor' || component.type === 'list' || component.type === 'button') && ( // Font size for text, anchor, list, button
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
                    )}
                    {(component.type === 'text' || component.type === 'list') && ( // Text color for text, list
                        <div className="mb-3">
                            <label htmlFor="textColor" className="block text-sm font-medium text-gray-700">Text Color:</label>
                            <input
                                id="textColor"
                                type="color"
                                value={component.textColor || '#333333'}
                                onChange={handleChange('textColor')}
                                className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm p-1"
                            />
                        </div>
                    )}
                </>
            )}

            {component.type === 'text' && (
                <>
                    <div className="mb-3">
                        <label htmlFor="textContent" className="block text-sm font-medium text-gray-700">Text Content (HTML allowed):</label>
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
                        <label htmlFor="imageAlt" className="block text-sm font-medium text-gray-700">Alt Text:</label>
                        <input
                            id="imageAlt"
                            type="text"
                            value={component.alt || ''}
                            onChange={handleChange('alt')}
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
                        <label htmlFor="imageAlign" className="block text-sm font-medium text-gray-700">Alignment:</label>
                        <select
                            id="imageAlign"
                            value={component.align || 'center'}
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
                        <label htmlFor="buttonHref" className="block text-sm font-medium text-gray-700">URL (href):</label>
                        <input
                            id="buttonHref"
                            type="text"
                            value={component.href || ''}
                            onChange={handleChange('href')}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-md p-2"
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
                        <label className="block text-sm font-medium text-gray-700">List Items (HTML allowed):</label>
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
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-md p-2"
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
                    <div className="mb-3">
                        <label htmlFor="textDecoration" className="block text-sm font-medium text-gray-700">Text Decoration:</label>
                        <select
                            id="textDecoration"
                            value={component.textDecoration || 'underline'}
                            onChange={handleChange('textDecoration')}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        >
                            <option value="underline">Underline</option>
                            <option value="none">None</option>
                        </select>
                    </div>
                </>
            )}

            {component.type === 'two-column-block' && (
                <>
                    <div className="mb-3">
                        <label htmlFor="blockBackgroundColor" className="block text-sm font-medium text-gray-700">Background Color:</label>
                        <input
                            id="blockBackgroundColor"
                            type="color"
                            value={component.backgroundColor || '#f0f0f0'}
                            onChange={handleChange('backgroundColor')}
                            className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm p-1"
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="blockPadding" className="block text-sm font-medium text-gray-700">Padding (px):</label>
                        <input
                            id="blockPadding"
                            type="number"
                            value={component.padding !== undefined ? component.padding : ''}
                            onChange={handleChange('padding', 'number')}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            min="0"
                        />
                    </div>
                    <p className="text-sm text-gray-600 mt-4">
                        To edit content within columns, click inside the respective column on the canvas.
                    </p>
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
    const fileInputRef = useRef(null); // Ref for file input

    const nextId = useRef(0);
    useEffect(() => {
        // Find the maximum existing ID and set nextId.current one higher
        const maxId = components.reduce((max, comp) => Math.max(max, comp.id || 0), -1);
        nextId.current = maxId + 1;
    }, [components]); // Recalculate whenever components change

    const handleDrop = useCallback((item, index) => {
        setComponents((prev) => {
            const componentType = typeof item.type === 'string' ? item.type : 'unknown';
            const newItem = {
                id: nextId.current++, // Use and increment nextId.current
                ...getInitialComponentProps(componentType)
            };

            const newComponents = [...prev];
            newComponents.splice(index, 0, newItem);
            return newComponents;
        });
        setSelectedIndex(index);
    }, []);

    const handleSelect = useCallback((index) => {
        setSelectedIndex(index);
    }, []);

    const handlePropertyChange = useCallback((newProps) => {
        setComponents((prev) => {
            const newComponents = [...prev];
            if (selectedIndex !== null && newComponents[selectedIndex]) {
                newComponents[selectedIndex] = newProps;
            }
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
        setSelectedIndex(null);
    }, [selectedIndex]);

    // ... (rest of your EmailBuilder.js code remains the same) ...

    const generateEmailHtmlForComponents = useCallback((comps) => {
        return comps.map((comp) => {
            const cellPadding = comp.padding !== undefined ? `${comp.padding}px` : '10px';
            const textAlign = comp.align || 'left';
            const fontSize = comp.fontSize ? `${comp.fontSize}px` : '16px';
            const fontWeight = comp.bold ? 'bold' : 'normal';
            const lineHeight = '1.5em'; // Consistent line-height for email compatibility
            const textColor = comp.textColor || '#333333';

            let contentHtml = '';
            let outerTableWrapper = false; // Flag if we need an extra table wrapper for basic components

            switch (comp.type) {
                case 'text':
                    contentHtml = `<p style="margin:0; padding:0; font-size:${fontSize}; line-height:${lineHeight}; color:${textColor}; font-weight:${fontWeight};">${comp.content || 'This is a text block'}</p>`;
                    break;
                case 'image':
                    const imageAlignStyle = comp.align === 'center' ? 'display:block; margin:0 auto;' : (comp.align === 'right' ? 'display:block; margin:0 0 0 auto;' : 'display:block;');
                    const imageWidth = comp.width ? `width:${comp.width}px;` : 'width:auto;';
                    const imageHeight = comp.height ? `height:${comp.height}px;` : 'height:auto;';
                    const borderRadius = comp.borderRadius ? `border-radius:${comp.borderRadius}px;` : 'border-radius:0px;';
                    contentHtml = `<img src="${comp.src || 'https://placehold.co/300x100'}" alt="${comp.alt || ''}" width="${comp.width || ''}" height="${comp.height || ''}" style="${imageAlignStyle} max-width:100%; ${imageWidth} ${imageHeight} ${borderRadius} outline:none; text-decoration:none;" />`;
                    outerTableWrapper = true; // Images often need an extra table wrapper for alignment/sizing
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
                                        style="background-color:${comp.color || '#007bff'}; color:${comp.textColor || '#ffffff'}; padding:${comp.buttonPadding || '10px 20px'}; text-decoration:none; border-radius:${comp.borderRadius || '4'}px; font-size:${fontSize}; font-weight:${fontWeight}; display:inline-block; mso-padding-alt:0px;">
                                        ${comp.label || 'Click Me'}
                                    </a>
                                </td>
                            </tr>
                        </table>
                    `;
                    // Button already has its own table structure, no need for the generic outer one
                    outerTableWrapper = false;
                    break;
                case 'two-column-block':
                    const blockBgColor = comp.backgroundColor || '#f0f0f0';
                    const blockPadding = comp.padding !== undefined ? `${comp.padding}px` : '20px';
                    // Recursively generate HTML for components WITHIN the columns
                    const leftColumnHtml = generateEmailHtmlForComponents(comp.columns.left);
                    const rightColumnHtml = generateEmailHtmlForComponents(comp.columns.right);

                    // The structure of the two-column block itself
                    contentHtml = `
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; background-color:${blockBgColor};">
                            <tr>
                                <td style="padding:${blockPadding};">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                                        <tr>
                                            <td width="50%" valign="top" style="padding-right:5px;">
                                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                                                    <tbody>
                                                        ${leftColumnHtml}
                                                    </tbody>
                                                </table>
                                            </td>
                                            <td width="50%" valign="top" style="padding-left:5px;">
                                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                                                    <tbody>
                                                        ${rightColumnHtml}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                        `;
                    // For a two-column block, its *entire* structure is the "content" of its parent td,
                    // and it's already a table, so no additional outerTableWrapper or tr/td is needed here,
                    // as it will be wrapped by the main tr/td structure below.
                    outerTableWrapper = false; // It's already a full table, no need for an *extra* wrapper.
                    break;
                default:
                    return ``;
            }

            // Universal wrapper for ALL top-level components (including the two-column block)
            // This ensures every component is a direct <tr> child of the main <tbody>
            return `
                <tr>
                    <td align="${textAlign}" style="padding:${cellPadding};">
                        ${outerTableWrapper ? `
                            <table border="0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;">
                                <tbody>
                                    <tr>
                                        <td align="${textAlign}" class="bme${comp.type.charAt(0).toUpperCase() + comp.type.slice(1)}" style="border-collapse: collapse; padding: 0px; background-color: rgb(255, 255, 255);">
                                            ${contentHtml}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        ` : contentHtml}
                    </td>
                </tr>
            `;
        }).join('\n');
    }, []);

// ... (rest of your EmailBuilder.js code remains the same) ...

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
      <tr>
        <td style="display:none;font-size:1px;color:#f4f4f4;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
          ${(components[0] && components[0].type === 'text' && components[0].content) ? components[0].content.replace(/<[^>]*>?/gm, '').substring(0, 100) : 'Your email preheader text'}
        </td>
      </tr>
      <tbody>
      ${mainContentHtml}
      </tbody>
      <tr>
        <td align="center" bgcolor="#f4f4f4" style="padding: 10px; font-size: 12px; color: #aaaaaa; font-family: Arial, sans-serif;">
          &copy; 2025 Your Company. All rights reserved.
        </td>
      </tr>
    </table>
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
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (copyErr) {
            console.error('Failed to copy HTML using execCommand:', copyErr);
            alert('Failed to copy HTML. Please manually copy from console.');
        } finally {
            document.body.removeChild(textArea);
        }
    }, [components, generateEmailHtmlForComponents]);


    // --- IMPROVED LOADING LOGIC ---

    // Helper to extract a numeric value (e.g., "10px" -> 10) from a style property
    const getNumericStyleValue = (styleValue, defaultValue) => {
        const match = String(styleValue).match(/(\d+(?:\.\d+)?)px/); // Handle float numbers like 257.6px
        return match ? parseFloat(match[1]) : defaultValue;
    };

    // Recursive helper to parse HTML elements into component props for nested columns
    const parseHtmlElementsToComponents = useCallback((containerElement) => {
        const parsedComps = [];
        // console.log('--- Starting parseHtmlElementsToComponents for container:', containerElement.tagName, containerElement);

        const rows = containerElement.querySelectorAll(':scope > tr'); // Only direct tr children
        if (rows.length === 0) {
            // console.warn('No direct <tr> children found in container:', containerElement.outerHTML);
        }

        rows.forEach((row, rowIndex) => {
            // console.log(`--- Processing row ${rowIndex}:`, row.outerHTML);
            const td = row.querySelector(':scope > td'); // Only direct td child
            if (!td) {
                // console.warn(`Row ${rowIndex} has no direct <td> child. Skipping.`, row.outerHTML);
                return;
            }

            // Check if it's a two-column block by looking for the specific nested table structure
            const twoColumnTableCheck = td.querySelector(':scope > table[width="100%"] > tbody > tr > td[width="50%"]');
            if (twoColumnTableCheck) {
                // console.log(`Row ${rowIndex} identified as TWO-COLUMN block.`);
                const blockPadding = getNumericStyleValue(td.style.padding, 20);
                const blockBgColor = td.style.backgroundColor || '#f0f0f0';

                const leftColumnTable = td.querySelector(':scope > table[width="100%"] > tbody > tr > td[width="50%"]:first-of-type > table');
                const rightColumnTable = td.querySelector(':scope > table[width="100%"] > tbody > tr > td[width="50%"]:last-of-type > table');

                parsedComps.push({
                    id: nextId.current++,
                    type: 'two-column-block',
                    backgroundColor: blockBgColor,
                    padding: blockPadding,
                    columns: {
                        left: leftColumnTable ? parseHtmlElementsToComponents(leftColumnTable.querySelector('tbody')) : [],
                        right: rightColumnTable ? parseHtmlElementsToComponents(rightColumnTable.querySelector('tbody')) : [],
                    }
                });
                return; // This row was a two-column block, move to the next row
            }

            // --- Generic single component parsing ---
            let currentElement = td.firstElementChild;
            let componentElement = null; // This will hold the actual content element (<p>, <img>, <a>, <ul>, <ol>)
            let containerTdForProps = td; // This will hold the TD from which padding/align should be read

            // console.log(`Row ${rowIndex}: Initial check, td.firstElementChild:`, currentElement ? currentElement.tagName : 'NONE', currentElement ? currentElement.outerHTML.substring(0, 100) : '');

            // Traverse down potential wrapper tables
            while (currentElement && currentElement.tagName === 'TABLE') {
                // Check if this table is the BUTTON specific table structure
                const isButtonTable = currentElement.querySelector('a[style*="background-color"]');
                if (isButtonTable) {
                    componentElement = currentElement; // The button table itself is the component "element"
                    break; // Found the button, stop traversing
                }

                // If not a button table, it's a generic wrapper. Dive deeper.
                // Assuming content is in a single cell, usually the last one for robustness
                const innerTr = currentElement.querySelector('tr');
                if (!innerTr) {
                    // console.warn(`Row ${rowIndex}: Wrapper table has no 'tr' child. Cannot dive deeper.`);
                    componentElement = currentElement; // Treat the table itself as the component if no deeper TD found
                    break;
                }
                const innerTd = innerTr.querySelector('td:last-child');
                if (!innerTd) {
                    // console.warn(`Row ${rowIndex}: Inner TR has no 'td' child. Cannot dive deeper.`);
                    componentElement = currentElement; // Treat the table itself as the component if no deeper TD found
                    break;
                }

                containerTdForProps = innerTd; // This is the TD whose padding/align apply to the actual component
                currentElement = innerTd.firstElementChild; // Go one level deeper
                // console.log(`Row ${rowIndex}: Diving into wrapper table. New currentElement:`, currentElement ? currentElement.tagName : 'NONE', currentElement ? currentElement.outerHTML.substring(0, 100) : '');
            }

            componentElement = componentElement || currentElement; // If loop broke due to non-table, use currentElement

            if (!componentElement) {
                // console.warn(`Row ${rowIndex}: Could not find a recognizable component element in TD:`, td.outerHTML);
                return;
            }

            // console.log(`Row ${rowIndex}: Final componentElement for parsing:`, componentElement.tagName, componentElement.outerHTML.substring(0, 100));

            // Extract common properties from the containerTdForProps (which is the TD directly wrapping the component)
            const commonProps = {
                padding: getNumericStyleValue(containerTdForProps.style.padding, 10),
                align: containerTdForProps.style.textAlign || 'left',
                // Font size and text color are usually on the actual content element
                fontSize: getNumericStyleValue(componentElement.style.fontSize, 16),
                textColor: componentElement.style.color || '#333333',
                bold: componentElement.style.fontWeight === 'bold' || parseFloat(componentElement.style.fontWeight) >= 700,
            };

            let componentData = null;

            if (componentElement.tagName === 'P') {
                // console.log(`Row ${rowIndex}: Identified as TEXT component.`);
                componentData = {
                    type: 'text',
                    content: componentElement.innerHTML.trim(),
                };
            } else if (componentElement.tagName === 'IMG') {
                // console.log(`Row ${rowIndex}: Identified as IMAGE component.`);
                const imgAlign = componentElement.style.margin === '0px auto' || componentElement.style.margin === '0 auto' ? 'center' :
                                 componentElement.style.marginLeft === 'auto' ? 'right' : 'left'; // Corrected image align inference
                componentData = {
                    type: 'image',
                    src: componentElement.getAttribute('src') || '',
                    alt: componentElement.getAttribute('alt') || '',
                    width: getNumericStyleValue(componentElement.style.width, 300) || parseFloat(componentElement.getAttribute('width')),
                    height: getNumericStyleValue(componentElement.style.height, 100) || parseFloat(componentElement.getAttribute('height')),
                    borderRadius: getNumericStyleValue(componentElement.style.borderRadius, 0),
                    align: imgAlign,
                };
            } else if (componentElement.tagName === 'TABLE' && componentElement.querySelector('a[style*="background-color"]')) {
                // console.log(`Row ${rowIndex}: Identified as BUTTON component.`);
                const anchor = componentElement.querySelector('a');
                if (anchor) {
                    componentData = {
                        type: 'button',
                        label: anchor.innerText.trim(),
                        href: anchor.getAttribute('href') || '#',
                        color: anchor.style.backgroundColor || '#007bff',
                        textColor: anchor.style.color || '#ffffff',
                        buttonPadding: anchor.style.padding || '10px 20px',
                        borderRadius: getNumericStyleValue(anchor.style.borderRadius, 4),
                        align: containerTdForProps.style.textAlign || 'center', // Button align is from parent td or current containerTdForProps
                        fontSize: getNumericStyleValue(anchor.style.fontSize, 16),
                        fontWeight: anchor.style.fontWeight || 'normal',
                    };
                }
            } else if (componentElement.tagName === 'UL' || componentElement.tagName === 'OL') {
                // console.log(`Row ${rowIndex}: Identified as LIST component.`);
                const items = Array.from(componentElement.children).map(li => li.innerHTML.trim());
                componentData = {
                    type: 'list',
                    items: items,
                    ordered: componentElement.tagName === 'OL',
                };
            } else if (componentElement.tagName === 'A' && componentElement.style.textDecoration) {
                // console.log(`Row ${rowIndex}: Identified as ANCHOR component.`);
                componentData = {
                    type: 'anchor',
                    text: componentElement.innerText.trim(),
                    href: componentElement.getAttribute('href') || '#',
                    textColor: componentElement.style.color || '#007bff',
                    textDecoration: componentElement.style.textDecoration || 'underline',
                };
            }

            if (componentData) {
                // console.log(`Row ${rowIndex}: Pushing component of type: ${componentData.type}`);
                parsedComps.push({ id: nextId.current++, ...commonProps, ...componentData });
            } else {
                // console.warn(`Row ${rowIndex}: Could not parse HTML snippet into a known component. Final element:`, componentElement.outerHTML);
            }
        });
        // console.log('--- Finished parseHtmlElementsToComponents. Parsed components:', parsedComps.length);
        return parsedComps;
    }, []); // No dependencies for useCallback, as it's a self-contained helper operating on DOM elements.


    const handleLoadHtmlContent = useCallback((htmlContent) => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const mainContentTable = doc.querySelector('table[width="600"]'); // Target the main content table
            if (!mainContentTable) {
                alert("Error: The HTML structure does not match a recognizable email template (main table with width='600' not found).");
                setComponents([]);
                setSelectedIndex(null);
                return;
            }

            // Pass the tbody element of the main table to the recursive parser
            // Ensure the main table has a tbody. If not, it's usually body itself or main table directly has tr.
            const mainTbody = mainContentTable.querySelector('tbody');
            const componentsContainer = mainTbody || mainContentTable; // Fallback if tbody is missing, assume tr are direct children

            const parsedComps = parseHtmlElementsToComponents(componentsContainer);
            setComponents(parsedComps);
            setSelectedIndex(null);
            // nextId.current will be updated by useEffect on components state change
            alert('HTML loaded successfully!');
        } catch (error) {
            console.error('Error loading HTML:', error);
            alert('Failed to load HTML. Please ensure it\'s a valid structure generated by this builder, or a simple HTML file.');
        }
    }, [parseHtmlElementsToComponents]);


    // Handle file input
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const htmlContent = e.target.result;
                handleLoadHtmlContent(htmlContent);
            };
            reader.onerror = (e) => {
                console.error("Error reading file:", e);
                alert("Failed to read file.");
            };
            reader.readAsText(file);
            // Clear the file input value to allow selecting the same file again
            event.target.value = '';
        }
    };


    // console.log('EmailBuilder rendering. Components:', components, 'Selected Index:', selectedIndex);

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="flex flex-col md:flex-row gap-5 p-5 min-h-screen bg-gray-100 font-inter">
                {/* Toolbox */}
                <div className="w-full md:w-56 flex-shrink-0 bg-white p-4 rounded-md shadow-md">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Toolbox</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <ToolboxItem type="text" label="Text Block" />
                        <ToolboxItem type="image" label="Image" />
                        <ToolboxItem type="button" label="Button" />
                        <ToolboxItem type="list" label="List" />
                        <ToolboxItem type="anchor" label="Link" />
                        <ToolboxItem type="two-column-block" label="2 Column" />
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

                    <div className="mt-6 p-4 border border-gray-300 rounded-md bg-gray-50">
                        <h4 className="text-md font-semibold mb-2 text-gray-700">Load HTML from File</h4>
                        <input
                            type="file"
                            accept=".html"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Upload an HTML file (preferably one exported from this builder) to load it onto the canvas.
                        </p>
                    </div>
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