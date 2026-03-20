// js/editor.js

const PPI = 96; 
let pageWidthPx = 8 * PPI;
let pageHeightPx = 11 * PPI;

// --- 1. Initialize ONE Canvas ---
const canvas = new fabric.Canvas('spread-canvas', { backgroundColor: '#ffffff' });

// --- 2. Project Variables ---
let totalPages = 12; 
let currentSpread = 0; 
let maxSpreads = Math.ceil(totalPages / 2); 
let spreadsData = new Array(maxSpreads + 1).fill(null);

const basePrice = 500.00; 
const pricePerExtraPage = 50.00; 

// --- 3. View Logic (The "InDesign" Single Spread Setup) ---
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
        ctx.strokeStyle = '#cccccc'; 
        ctx.lineWidth = 2;
        ctx.stroke();
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

// --- 6. Navigation Buttons (FIXED: Removed Duplicates) ---
document.getElementById('prev-page-btn').addEventListener('click', () => {
    if (currentSpread > 0) {
        saveCurrentSpread(); 
        currentSpread--;     
        loadCurrentSpread(); 
        smartAutoZoom(); // Ensure zoom stays perfect when flipping pages
    }
});

document.getElementById('next-page-btn').addEventListener('click', () => {
    if (currentSpread < maxSpreads) {
        saveCurrentSpread(); 
        currentSpread++;     
        loadCurrentSpread(); 
        smartAutoZoom(); // Ensure zoom stays perfect when flipping pages
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

// --- 7. Workspace Zoom Slider & Mobile Auto-Zoom (FIXED) ---
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

// NEW: Packaged the math into a reusable function
function smartAutoZoom() {
    if (window.innerWidth <= 768) {
        let currentCanvasWidth = pageWidthPx * (currentSpread === 0 || currentSpread === maxSpreads ? 1 : 2);
        // FIXED: Increased subtraction to 100 to guarantee comfortable side margins
        let perfectZoom = (window.innerWidth - 100) / currentCanvasWidth;
        let finalZoom = perfectZoom < 0.2 ? 0.2 : perfectZoom; 
        zoomSlider.value = finalZoom;
        applyZoom(finalZoom);
    }
}

// --- 8. Custom Sizing & Reset Logic ---
function resizeCanvases(wPx, hPx) {
    pageWidthPx = wPx;
    pageHeightPx = hPx;
    updateSpreadView(); 
    canvas.renderAll();
    smartAutoZoom(); // Recalculate zoom when sizes change!
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

// --- 9. Add Text & Media (Perfect Boundaries & Centering) ---
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
            smartAutoZoom(); // Recalculate zoom for the newly loaded canvas!

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
    smartAutoZoom(); // Make sure it zooms back properly after compiling!

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
    sidebar.classList.toggle('collapsed');
});

const objectControlsPanel = document.getElementById('object-controls-section');

canvas.on('selection:created', () => { objectControlsPanel.style.display = 'block'; });
canvas.on('selection:updated', () => { objectControlsPanel.style.display = 'block'; });
canvas.on('selection:cleared', () => { objectControlsPanel.style.display = 'none'; });

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
updateSpreadView(); // Set the initial page math
smartAutoZoom();    // Set the initial zoom