// js/editor.js

const PPI = 96; 
let pageWidthPx = 8 * PPI;
let pageHeightPx = 11 * PPI;

// --- 1. Initialize ONE Canvas ---
const canvas = new fabric.Canvas('spread-canvas', { backgroundColor: '#ffffff' });

// --- UPGRADED: Mobile-Friendly Selection Handles ---
fabric.Object.prototype.set({
    transparentCorners: false,
    cornerColor: '#de222a',       
    cornerStrokeColor: '#ffffff', 
    borderColor: '#de222a',       
    cornerSize: 20,               
    touchCornerSize: 34,          // Massive hit-area for thumbs!
    padding: 8,                   
    cornerStyle: 'circle',        
    borderScaleFactor: 2,         
    rotatingPointOffset: 35       
});

// --- 2. Project Variables ---
let totalPages = 12; 
let currentSpread = 0; 
let maxSpreads = Math.ceil(totalPages / 2); 
let spreadsData = new Array(maxSpreads + 1).fill(null);

const basePrice = 500.00; 
const pricePerExtraPage = 50.00; 

// --- 3. View Logic ---
function updateSpreadView() {
    maxSpreads = Math.ceil(totalPages / 2);
    const indicator = document.getElementById('page-indicator');

    if (currentSpread === 0) {
        canvas.setWidth(pageWidthPx); 
        indicator.innerText = "Front Cover";
    } else if (currentSpread === maxSpreads) {
        canvas.setWidth(pageWidthPx); 
        indicator.innerText = "Back Cover";
    } else {
        canvas.setWidth(pageWidthPx * 2); 
        let leftPageNum = (currentSpread * 2) - 1;
        let rightPageNum = currentSpread * 2;
        indicator.innerText = `Pages ${leftPageNum} & ${rightPageNum}`;
    }
    
    canvas.setHeight(pageHeightPx);
    canvas.calcOffset();

    let currentTotal = basePrice;
    if (totalPages > 12) currentTotal += (totalPages - 12) * pricePerExtraPage;
    
    document.getElementById('price-display').innerText = `Total: ₱${currentTotal.toFixed(2)}`;
    document.getElementById('total-pages').innerText = totalPages;

    localStorage.setItem('receipt_total_pages', totalPages);
    localStorage.setItem('receipt_total_price', currentTotal.toFixed(2));
}

// --- 4. Draw the Spine (The middle crease) ---
canvas.on('after:render', function() {
    if (currentSpread > 0 && currentSpread < maxSpreads) {
        const ctx = canvas.contextContainer;
        ctx.beginPath();
        ctx.moveTo(pageWidthPx, 0); 
        ctx.lineTo(pageWidthPx, pageHeightPx); 
        
        // UPGRADED: Highly visible dashed spine line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'; 
        ctx.lineWidth = 3;                       
        ctx.setLineDash([15, 10]);               
        
        ctx.stroke();
        ctx.setLineDash([]); 
    }
});

// --- 5. Save & Load Engine ---
function saveCurrentSpread() {
    spreadsData[currentSpread] = canvas.toJSON();
}

function loadCurrentSpread() {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    if (spreadsData[currentSpread]) {
        canvas.loadFromJSON(spreadsData[currentSpread], canvas.renderAll.bind(canvas));
    }
    updateSpreadView();
}

// --- 6. Navigation Buttons ---
document.getElementById('prev-page-btn').addEventListener('click', () => {
    if (currentSpread > 0) {
        saveCurrentSpread(); currentSpread--; loadCurrentSpread(); smartAutoZoom(); 
    }
});

document.getElementById('next-page-btn').addEventListener('click', () => {
    if (currentSpread < maxSpreads) {
        saveCurrentSpread(); currentSpread++; loadCurrentSpread(); smartAutoZoom(); 
    }
});

document.getElementById('add-page-btn').addEventListener('click', () => {
    saveCurrentSpread();
    totalPages += 2; 
    maxSpreads = Math.ceil(totalPages / 2);
    spreadsData.splice(spreadsData.length - 1, 0, null); 
    currentSpread++; 
    loadCurrentSpread();
});

document.getElementById('delete-page-btn').addEventListener('click', () => {
    if (currentSpread === 0 || currentSpread === maxSpreads) {
        return alert("You cannot delete the Cover pages.");
    }
    if (totalPages > 12) {
        spreadsData.splice(currentSpread, 1);
        totalPages -= 2;
        maxSpreads = Math.ceil(totalPages / 2);
        loadCurrentSpread();
    } else {
        alert("Minimum 12 pages required.");
    }
});

// --- 7. Workspace Zoom Slider & Mobile Auto-Zoom ---
const zoomSlider = document.getElementById('zoom-slider');
const zoomValText = document.getElementById('zoom-val');
const zoomWrapper = document.getElementById('zoom-wrapper');

function applyZoom(zoomVal) {
    zoomValText.innerText = `${Math.round(zoomVal * 100)}%`;
    zoomWrapper.style.transform = `scale(${zoomVal})`;
}

zoomSlider.addEventListener('input', (e) => {
    applyZoom(e.target.value);
});

document.getElementById('zoom-in-btn').addEventListener('click', () => {
    let currentZoom = parseFloat(zoomSlider.value);
    if (currentZoom < 2) {
        zoomSlider.value = (currentZoom + 0.1).toFixed(1);
        applyZoom(zoomSlider.value);
    }
});

document.getElementById('zoom-out-btn').addEventListener('click', () => {
    let currentZoom = parseFloat(zoomSlider.value);
    if (currentZoom > 0.2) {
        zoomSlider.value = (currentZoom - 0.1).toFixed(1);
        applyZoom(zoomSlider.value);
    }
});

function smartAutoZoom() {
    if (window.innerWidth <= 768) {
        let currentCanvasWidth = pageWidthPx * (currentSpread === 0 || currentSpread === maxSpreads ? 1 : 2);
        let perfectZoom = (window.innerWidth - 100) / currentCanvasWidth;
        let finalZoom = perfectZoom < 0.2 ? 0.2 : perfectZoom; 
        zoomSlider.value = finalZoom;
        applyZoom(finalZoom);
    }
}

// --- NEW: Multi-Touch Gestures (Pinch to Zoom & Pan) ---
const canvasContainer = document.querySelector('.canvas-container');
let initialPinchDistance = null;
let initialZoomBeforePinch = 1;
let lastPanX = null;
let lastPanY = null;

canvasContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        // Calculate the distance between the two fingers
        initialPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        initialZoomBeforePinch = parseFloat(zoomSlider.value);
        
        // Track center point for panning
        lastPanX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        lastPanY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
}, { passive: false });

canvasContainer.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDistance) {
        e.preventDefault(); // Stop the screen from bouncing around
        
        // 1. PINCH TO ZOOM LOGIC
        const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const zoomDelta = currentDistance / initialPinchDistance;
        let newZoom = initialZoomBeforePinch * zoomDelta;

        // Keep zoom within the slider's limits (0.2x to 2x)
        if (newZoom < 0.2) newZoom = 0.2;
        if (newZoom > 2) newZoom = 2;

        zoomSlider.value = newZoom.toFixed(2);
        applyZoom(newZoom);

        // 2. TWO-FINGER PANNING LOGIC
        const currentCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const currentCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        if (lastPanX !== null && lastPanY !== null) {
            const deltaX = lastPanX - currentCenterX;
            const deltaY = lastPanY - currentCenterY;
            
            // Move the scroll container smoothly to follow the fingers
            canvasContainer.scrollBy(deltaX, deltaY);
        }

        lastPanX = currentCenterX;
        lastPanY = currentCenterY;
    }
}, { passive: false });

canvasContainer.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        initialPinchDistance = null;
        lastPanX = null;
        lastPanY = null;
    }
});

// --- 8. Custom Sizing & Reset Logic ---
function resizeCanvases(wPx, hPx) {
    pageWidthPx = wPx;
    pageHeightPx = hPx;
    updateSpreadView(); 
    canvas.renderAll();
    smartAutoZoom(); 
}

document.getElementById('apply-size-btn').addEventListener('click', () => {
    const w = parseFloat(document.getElementById('book-width').value);
    const h = parseFloat(document.getElementById('book-height').value);
    if (w > 0 && h > 0) resizeCanvases(w * PPI, h * PPI);
});

document.getElementById('reset-size-btn').addEventListener('click', () => {
    document.getElementById('book-width').value = 8;
    document.getElementById('book-height').value = 11;
    resizeCanvases(8 * PPI, 11 * PPI);
});

// --- Helper function to collapse the toolbar ---
function closeToolbar() {
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('mobile-open');
    } else {
        sidebar.classList.add('collapsed');
    }
}

// --- 9. Add Text & Media ---
document.getElementById('image-upload').addEventListener('change', function(e) {
    if (currentSpread === 0 || currentSpread === maxSpreads) {
        return alert("Custom photos are not allowed on the Covers.");
    }
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(f) {
        fabric.Image.fromURL(f.target.result, function(img) {
            img.scaleToWidth(300);
            canvas.centerObject(img); 
            canvas.add(img); 
            canvas.setActiveObject(img);
            canvas.renderAll(); 
            
            closeToolbar(); // Auto-hide toolbar so they can see the photo!
        });
    };
    if (file) reader.readAsDataURL(file);
    this.value = ''; 
});

canvas.on('object:moving', function(e) {
    const obj = e.target;
    const bound = obj.getBoundingRect(); 
    const cvs = obj.canvas;

    if (bound.left < 0) obj.set('left', obj.left - bound.left);
    if (bound.top < 0) obj.set('top', obj.top - bound.top);
    if (bound.left + bound.width > cvs.width) obj.set('left', obj.left - ((bound.left + bound.width) - cvs.width));
    if (bound.top + bound.height > cvs.height) obj.set('top', obj.top - ((bound.top + bound.height) - cvs.height));
    obj.setCoords(); 
});

// --- 10. Text Tool & Typography Engine ---
document.getElementById('add-text-btn').addEventListener('click', () => {
    let selectedFont = document.getElementById('font-family').value;
    if (selectedFont === 'Poppins') { selectedFont = 'Roboto'; }
    
    const text = new fabric.IText('Double-click to edit', { 
        fontFamily: selectedFont, 
        fontSize: 40, 
        fill: '#3a3a3a' 
    });
    
    canvas.centerObject(text);
    canvas.add(text); 
    canvas.setActiveObject(text);
    
    closeToolbar(); // Auto-hide toolbar so they can see the text!
});

document.getElementById('font-family').addEventListener('change', function(e) {
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
        activeObject.set('fontFamily', e.target.value);
        canvas.renderAll(); 
    }
});

canvas.on('selection:created', updateFontDropdown);
canvas.on('selection:updated', updateFontDropdown);

function updateFontDropdown(e) {
    const selectedObj = e.selected[0];
    if (selectedObj && selectedObj.type === 'i-text') {
        document.getElementById('font-family').value = selectedObj.fontFamily;
    }
}

// --- 11. Save & Load Project Files ---
document.getElementById('save-progress-btn').addEventListener('click', () => {
    saveCurrentSpread();
    const projectData = {
        totalPages: totalPages,
        spreadsData: spreadsData,
        pageWidthPx: pageWidthPx,
        pageHeightPx: pageHeightPx
    };
    const dataStr = JSON.stringify(projectData);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "my_photobook_project.json"; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('load-progress-btn').addEventListener('click', () => {
    document.getElementById('load-project-upload').click();
});

document.getElementById('load-project-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return; 

    const reader = new FileReader();
    reader.onload = function(f) {
        try {
            const projectData = JSON.parse(f.target.result);
            totalPages = projectData.totalPages;
            spreadsData = projectData.spreadsData;
            pageWidthPx = projectData.pageWidthPx;
            pageHeightPx = projectData.pageHeightPx;

            document.getElementById('book-width').value = pageWidthPx / PPI;
            document.getElementById('book-height').value = pageHeightPx / PPI;

            currentSpread = 0;
            maxSpreads = Math.ceil(totalPages / 2);

            loadCurrentSpread();
            smartAutoZoom(); 
            alert("Project loaded successfully!");
        } catch (error) {
            alert("Oops! This doesn't look like a valid photobook save file.");
        }
    };
    reader.readAsText(file);
    this.value = '';
});

// --- 12. PDF Generation & Sending to Server ---
let pendingPdfBlob = null; 

document.getElementById('generate-pdf-btn').addEventListener('click', async () => {
    alert("Compiling your Photobook! This might take a few seconds. Please don't close the page.");
    saveCurrentSpread(); 

    const { jsPDF } = window.jspdf;
    const singleWidthInches = pageWidthPx / PPI;
    const singleHeightInches = pageHeightPx / PPI;
    
    const pdf = new jsPDF({ 
        unit: 'in',
        format: [singleWidthInches, singleHeightInches] 
    }); 

    for (let i = 0; i <= maxSpreads; i++) {
        let isCover = (i === 0);
        let isBackCover = (i === maxSpreads);

        canvas.setWidth(isCover || isBackCover ? pageWidthPx : (pageWidthPx * 2));
        canvas.clear();
        canvas.backgroundColor = '#ffffff';

        if (spreadsData[i]) {
            await new Promise(resolve => {
                canvas.loadFromJSON(spreadsData[i], () => {
                    canvas.renderAll();
                    resolve(); 
                });
            });
        } else {
            canvas.renderAll(); 
        }

        if (isCover) {
            const imgData = canvas.toDataURL({ format: 'jpeg', quality: 1.0 });
            pdf.addImage(imgData, 'JPEG', 0, 0, singleWidthInches, singleHeightInches);
        } else if (isBackCover) {
            const imgData = canvas.toDataURL({ format: 'jpeg', quality: 1.0 });
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, singleWidthInches, singleHeightInches);
        } else {
            const leftImgData = canvas.toDataURL({ 
                format: 'jpeg', quality: 1.0, 
                left: 0, top: 0, width: pageWidthPx, height: pageHeightPx 
            });
            pdf.addPage();
            pdf.addImage(leftImgData, 'JPEG', 0, 0, singleWidthInches, singleHeightInches);

            const rightImgData = canvas.toDataURL({ 
                format: 'jpeg', quality: 1.0, 
                left: pageWidthPx, top: 0, width: pageWidthPx, height: pageHeightPx 
            });
            pdf.addPage();
            pdf.addImage(rightImgData, 'JPEG', 0, 0, singleWidthInches, singleHeightInches);
        }
    }

    loadCurrentSpread(); 
    smartAutoZoom(); 

    pendingPdfBlob = pdf.output('blob');
    pdf.save('My_DMC_Photobook.pdf');
    document.getElementById('order-modal').style.display = 'flex';
});

document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('order-modal').style.display = 'none';
    pendingPdfBlob = null; 
});

document.getElementById('send-to-printer-btn').addEventListener('click', async () => {
    document.getElementById('order-modal').style.display = 'none';
    alert("Sending your design to DMC Busa Printers... Please wait.");

    const formData = new FormData();
    formData.append('photobook_pdf', pendingPdfBlob, 'Customer_Photobook.pdf');
    formData.append('total_price', document.getElementById('price-display').innerText);

    try {
        const response = await fetch('php/process_pdf.php', { method: 'POST', body: formData });
        const result = await response.text();
        alert("Success! " + result); 
    } catch (error) {
        alert("Oops! There was a network error sending the PDF to the server.");
        console.error(error);
    }
});

// --- 13. Sidebar Toggle & Object Controls ---
document.getElementById('toggle-sidebar-btn').addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.toggle('mobile-open');
    } else {
        sidebar.classList.remove('mobile-open');
        sidebar.classList.toggle('collapsed');
    }
});

document.getElementById('close-drawer-btn').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('mobile-open');
});

const objectControlsPanel = document.getElementById('object-controls-section');

canvas.on('selection:created', () => { 
    objectControlsPanel.style.display = 'block'; 
    if (window.innerWidth <= 768) document.querySelector('.sidebar').classList.add('mobile-open');
});

canvas.on('selection:updated', () => { 
    objectControlsPanel.style.display = 'block'; 
    if (window.innerWidth <= 768) document.querySelector('.sidebar').classList.add('mobile-open');
});

canvas.on('selection:cleared', () => { 
    objectControlsPanel.style.display = 'none'; 
});

document.getElementById('bring-forward-btn').addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
        canvas.bringForward(activeObj);
        canvas.renderAll();
    }
});

document.getElementById('send-backward-btn').addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
        canvas.sendBackwards(activeObj); 
        canvas.renderAll();
    }
});

document.getElementById('delete-object-btn').addEventListener('click', () => {
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
        if (activeObj.type === 'activeSelection') {
            activeObj.forEachObject(obj => canvas.remove(obj));
            canvas.discardActiveObject(); 
        } else {
            canvas.remove(activeObj);
        }
        canvas.renderAll();
        objectControlsPanel.style.display = 'none'; 
    }
});

// --- 14. Open Receipt Page ---
document.getElementById('view-receipt-btn').addEventListener('click', () => {
    window.open('receipt.html', '_blank'); 
});

// --- STARTUP LOGIC ---
updateSpreadView(); 
smartAutoZoom();