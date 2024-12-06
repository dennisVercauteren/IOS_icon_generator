// Icons data and search index
let brandsData = [];
let remixData = [];
let currentLibrary = 'brands';
let iconsData = [];
let loadedIcons = new Map();
let selectedIcon = null;

// Elements
const iconsGrid = document.getElementById('iconsGrid');
const iconSearch = document.getElementById('iconSearch');
const iconLibrarySelect = document.getElementById('iconLibrary');

// Cache for the default SVG content and color state
let cachedAppleSvg = null;
let lastUsedColor = null;
let updateQueued = false;

// Load default apple icon
async function loadDefaultIcon() {
    try {
        if (!cachedAppleSvg) {
            const response = await fetch('apple.svg');
            let svgContent = await response.text();
            // Modify the SVG content to make it color-changeable
            svgContent = svgContent.replace(/<svg/, '<svg fill="currentColor"');
            svgContent = svgContent.replace(/<path/, '<path fill="#000000"');
            cachedAppleSvg = svgContent;
        }
        
        // Create a new image and wait for it to load
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                selectedIcon = img;
                baseColor = '#000000';  // Set default color to black
                iconColor = baseColor;
                lastUsedColor = baseColor;
                
                // Update color pickers
                const colorPicker = document.getElementById('colorPicker');
                const iconColorPicker = document.getElementById('iconColorPicker');
                if (colorPicker) colorPicker.value = baseColor;
                if (iconColorPicker) iconColorPicker.value = iconColor;
                
                drawIcon();
                resolve();
            };
            img.onerror = reject;
            img.dataset.title = 'Default Apple Icon';
            const coloredSvg = cachedAppleSvg.replace(/currentColor/g, iconColor);
            img.src = 'data:image/svg+xml,' + encodeURIComponent(coloredSvg);
        });
    } catch (error) {
        console.error('Error loading default icon:', error);
    }
}

// Debounced update function for smoother color changes
function debouncedUpdate(color) {
    if (!updateQueued && lastUsedColor !== color) {
        updateQueued = true;
        requestAnimationFrame(() => {
            const coloredSvg = cachedAppleSvg.replace(/currentColor/g, color);
            const img = new Image();
            img.onload = () => {
                selectedIcon = img;
                lastUsedColor = color;
                drawIcon();
                updateQueued = false;
            };
            img.dataset.title = 'Default Apple Icon';
            img.src = 'data:image/svg+xml,' + encodeURIComponent(coloredSvg);
        });
    }
}

// Update default icon with a new color (optimized)
function updateDefaultIconWithColor(color) {
    if (selectedIcon && selectedIcon.dataset.title === 'Default Apple Icon' && cachedAppleSvg) {
        debouncedUpdate(color);
    }
}

// Load both icon libraries
async function loadIconLibraries() {
    try {
        // Load the default apple icon first
        await loadDefaultIcon();

        const [brandsResponse, remixResponse] = await Promise.all([
            fetch('simple-icons.json'),
            fetch('remix-icons.json')
        ]);

        const [brandsJson, remixJson] = await Promise.all([
            brandsResponse.json(),
            remixResponse.json()
        ]);

        brandsData = brandsJson.icons;
        remixData = remixJson.icons;
        iconsData = brandsData; // Default to brands

        console.log(`Loaded ${brandsData.length} brand icons and ${remixData.length} remix icons`);

        // Display icons
        displayIcons(iconsData);
    } catch (error) {
        console.error('Error loading icons:', error);
    }
}

// Add pagination variables
let currentPage = 0;
let iconsPerPage = 50; // Show fewer icons initially
let isLoading = false;
let allIconsLoaded = false;

// Display icons in grid with pagination
async function displayIcons(icons, append = false) {
    if (!append) {
        iconsGrid.innerHTML = '';
        currentPage = 0;
        allIconsLoaded = false;
    }

    const start = currentPage * iconsPerPage;
    const end = start + iconsPerPage;
    const iconSlice = icons.slice(start, end);

    for (const icon of iconSlice) {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon-item';
        iconDiv.dataset.title = icon.title;

        // Create tooltip
        const tooltip = document.createElement('span');
        tooltip.className = 'icon-tooltip';
        tooltip.textContent = icon.title;

        // Set the SVG content
        const svgContent = await loadSvgContent(icon);
        if (svgContent) {
            iconDiv.innerHTML = svgContent;
            iconDiv.appendChild(tooltip);

            // Add click handler
            iconDiv.addEventListener('click', () => {
                baseColor = `#${icon.hex}`;
                iconColor = baseColor;

                document.getElementById('colorPicker').value = baseColor;
                document.getElementById('iconColorPicker').value = iconColor;

                loadIcon(icon.title)
                    .then(img => {
                        selectedIcon = img;
                        drawIcon();
                    })
                    .catch(err => console.error('Error loading icon:', err));
            });

            iconsGrid.appendChild(iconDiv);
        }
    }

    isLoading = false;
    if (end >= icons.length) {
        allIconsLoaded = true;
    }
}

// Load and cache SVG content
async function loadSvgContent(icon) {
    if (loadedIcons.has(icon.source)) {
        return loadedIcons.get(icon.source);
    }

    try {
        const response = await fetch(icon.source);
        const svgContent = await response.text();
        loadedIcons.set(icon.source, svgContent);
        return svgContent;
    } catch (error) {
        console.error('Error loading SVG:', error);
        return null;
    }
}

// Filter icons based on search term
function filterIcons(searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    const filteredIcons = iconsData.filter(icon =>
        icon.title.toLowerCase().includes(searchLower)
    );
    displayIcons(filteredIcons); // This will reset pagination
    return filteredIcons;
}
// Handle search input
iconSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    const filteredIcons = filterIcons(searchTerm);
});

// Handle library change
iconLibrarySelect.addEventListener('change', (e) => {
    currentLibrary = e.target.value;
    iconsData = currentLibrary === 'brands' ? brandsData : remixData;
    iconSearch.value = ''; // Clear search input
    displayIcons(iconsData); // This will reset pagination
});

// Add scroll handler
const iconsGridContainer = document.querySelector('.icons-grid-container');
iconsGridContainer.addEventListener('scroll', debounce(async () => {
    if (isLoading || allIconsLoaded) return;

    const { scrollTop, scrollHeight, clientHeight } = iconsGridContainer;
    if (scrollTop + clientHeight > scrollHeight - 200) { // Load more when near bottom
        isLoading = true;
        currentPage++;
        await displayIcons(iconsData, true);
    }
}, 100));

// Initialize icons
loadIconLibraries();

// Canvas and context
const canvas = document.getElementById('iconCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Default values
let baseColor = '#3498db';
let iconColor = '#3498db';
let radius = 125;
let iconScale = 50;
let grainAmount = 35;
let grainAmountIcon = 15;
let borderSize = 3;

// App appearance theme handling
let appTheme = 'light';

function toggleAppearance() {
    appTheme = appTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', appTheme);
    localStorage.setItem('appearance', appTheme);
    updateAppearanceButtonText();
}

function updateAppearanceButtonText() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.querySelector('.theme-toggle-text').textContent = 
            `Appearance${appTheme === 'light' ? 'Dark' : 'Light'}`;
    }
}

// Initialize appearance
document.addEventListener('DOMContentLoaded', () => {
    // Load saved appearance preference
    const savedAppearance = localStorage.getItem('appearance') || 'light';
    appTheme = savedAppearance;
    document.documentElement.setAttribute('data-theme', appTheme);
    updateAppearanceButtonText();

    // Add appearance toggle handler
    const appearanceToggle = document.getElementById('themeToggle');
    if (appearanceToggle) {
        appearanceToggle.addEventListener('click', toggleAppearance);
    }
});

// Icon theme variables (keep these separate)
let currentTheme = 'color';
let currentBaseTheme = 'light';
const lightColor = '#f0f0f0';
const darkColor = '#1a1a1a';

// Helper functions
function getBaseThemeColor() {
    switch (currentBaseTheme) {
        case 'light': return lightColor;
        case 'dark': return darkColor;
        case 'color': return baseColor;
        default: return baseColor;
    }
}

function getIconColor() {
    switch (currentTheme) {
        case 'light': return lightColor;
        case 'dark': return darkColor;
        case 'color': return iconColor;
        default: return iconColor;
    }
}

function updateActiveButton() {
    // Remove active class from icon color theme buttons only
    const iconColorButtons = document.querySelectorAll('#colorBtn, #lightBtn, #darkBtn');
    iconColorButtons.forEach(btn => btn.classList.remove('active'));
    document.getElementById(currentTheme + 'Btn').classList.add('active');
}

function updateBaseActiveButton() {
    // Remove active class from base color theme buttons only
    const baseColorButtons = document.querySelectorAll('#baseColorBtn, #baseLightBtn, #baseDarkBtn');
    baseColorButtons.forEach(btn => btn.classList.remove('active'));
    document.getElementById('base' + currentBaseTheme.charAt(0).toUpperCase() + currentBaseTheme.slice(1) + 'Btn').classList.add('active');
}

// ... rest of the code stays the same ...

function setBaseTheme(theme) {
    currentBaseTheme = theme;
    updateBaseActiveButton();

    if (theme === 'color') {
        colorPicker.value = baseColor;
    }

    drawIcon();
}

function setTheme(theme) {
    currentTheme = theme;
    updateActiveButton();

    if (theme === 'color') {
        iconColorPicker.value = iconColor;
    }

    if (selectedIcon && selectedIcon.dataset && selectedIcon.dataset.title) {
        loadIcon(selectedIcon.dataset.title)
            .then(img => {
                selectedIcon = img;
                drawIcon();
            })
            .catch(err => console.error('Error loading icon:', err));
    }
}

// Modify the updateColor function to use the optimized update
function updateColor(color) {
    baseColor = color;
    if (currentBaseTheme === 'color') {
        if (selectedIcon && selectedIcon.dataset.title === 'Default Apple Icon') {
            updateDefaultIconWithColor(color);
        } else {
            drawIcon();
        }
    }
}

function updateIconColor(color) {
    iconColor = color;
    if (currentTheme === 'color') {
        if (selectedIcon && selectedIcon.dataset.title === 'Default Apple Icon') {
            updateDefaultIconWithColor(color);
        } else if (selectedIcon && selectedIcon.dataset && selectedIcon.dataset.title) {
            loadIcon(selectedIcon.dataset.title)
                .then(img => {
                    selectedIcon = img;
                    drawIcon();
                })
                .catch(err => console.error('Error loading icon:', err));
        }
    }
}

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced draw function to prevent too frequent updates
const debouncedDraw = debounce(drawIcon, 100);

// Color picker
document.getElementById('colorPicker').addEventListener('input', (e) => {
    if (baseColor !== e.target.value) {
        baseColor = e.target.value;
        debouncedDraw();
    }
});

// Icon color picker
document.getElementById('iconColorPicker').addEventListener('input', (e) => {
    if (iconColor !== e.target.value) {
        iconColor = e.target.value;
        updateIconColor(iconColor);
    }
});

// Radius slider
document.getElementById('radiusSlider').addEventListener('input', (e) => {
    if (radius !== parseInt(e.target.value)) {
        radius = parseInt(e.target.value);
        debouncedDraw();
    }
});

// Grain slider
document.getElementById('grainSlider').addEventListener('input', (e) => {
    if (grainAmount !== parseInt(e.target.value)) {
        grainAmount = parseInt(e.target.value);
        debouncedDraw();
    }
});

// Scale slider
const scaleSlider = document.getElementById('scaleSlider');
const scaleValue = document.getElementById('scaleValue');

scaleSlider.addEventListener('input', (e) => {
    const scale = parseInt(e.target.value);
    scaleValue.textContent = `${scale}%`;
    iconScale = scale;
    drawIcon();
});

// Function to generate a random string
function generateRandomString(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Function to sanitize filename for cross-platform compatibility
function sanitizeFilename(filename) {
    // Remove invalid characters and replace spaces with underscores
    return filename
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, '_')
        .replace(/^\.+/, ''); // Remove leading periods
}

// Function to detect iOS device
function isIOS() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

// Function to convert canvas to blob
function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/png', 1.0);
    });
}

// Function to trigger download
document.getElementById('downloadBtn').addEventListener('click', async function () {
    if (!selectedIcon || !selectedIcon.dataset || !selectedIcon.dataset.title) {
        console.warn('No icon selected');
        return;
    }

    const iconTitle = selectedIcon.dataset.title;
    const randomSuffix = generateRandomString();
    const sanitizedTitle = sanitizeFilename(iconTitle);
    const filename = `${sanitizedTitle}_${randomSuffix}.png`;

    if (isIOS()) {
        try {
            // Get blob from canvas
            const blob = await canvasToBlob(canvas);
            const file = new File([blob], filename, { type: 'image/png' });

            // Use Web Share API
            if (navigator.share) {
                await navigator.share({
                    files: [file],
                    title: 'Save Icon',
                    text: 'Save your iOS icon'
                });
            } else {
                // Fallback to regular download if Web Share API is not available
                downloadFile(filename);
            }
        } catch (error) {
            console.error('Error sharing:', error);
            // Fallback to regular download
            downloadFile(filename);
        }
    } else {
        // Regular download for non-iOS devices
        downloadFile(filename);
    }
});

// Function to handle regular file download
function downloadFile(filename) {
    const link = document.createElement('a');
    const imageData = canvas.toDataURL('image/png', 1.0);
    link.download = filename;
    link.href = imageData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Drawing functions
function drawRoundedRectangle(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function adjustColor(color, amount) {
    let usePound = false;
    if (color[0] === "#") {
        color = color.slice(1);
        usePound = true;
    }
    let num = parseInt(color, 16);
    let r = (num >> 16) + amount;
    r = Math.max(Math.min(255, r), 0);
    let g = ((num >> 8) & 0x00FF) + amount;
    g = Math.max(Math.min(255, g), 0);
    let b = (num & 0x0000FF) + amount;
    b = Math.max(Math.min(255, b), 0);
    return (
        (usePound ? "#" : "") +
        r.toString(16).padStart(2, '0') +
        g.toString(16).padStart(2, '0') +
        b.toString(16).padStart(2, '0')
    );
}

function addGrain() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        let rand = (Math.random() - 0.5) * grainAmount;
        data[i] += rand;     // Red
        data[i + 1] += rand; // Green
        data[i + 2] += rand; // Blue
    }

    ctx.putImageData(imageData, 0, 0);
}

// Add with other variables at the top
let isGradientEnabled = true;

// Replace the toggleGradient function with this:
function setGradient(enabled) {
    isGradientEnabled = enabled;
    document.getElementById('gradientOnBtn').classList.toggle('active', enabled);
    document.getElementById('gradientOffBtn').classList.toggle('active', !enabled);
    drawIcon();
}

// Add with other event listeners
const borderSlider = document.getElementById('borderSlider');
const borderValue = document.getElementById('borderValue');

borderSlider.addEventListener('input', function() {
    borderSize = parseInt(this.value);
    borderValue.textContent = borderSize;
    drawIcon();
});

// Keep the original drawIcon function with all effects
function drawIcon() {
    if (!selectedIcon) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Step 1: Draw background with rounded corners
    ctx.save();
    ctx.beginPath();
    
    // Draw outer rounded rectangle for border
    if (borderSize > 0) {
        drawRoundedRectangle(ctx, 0, 0, 1024, 1024, radius);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fill();
    }
    
    // Draw inner rounded rectangle for main background
    drawRoundedRectangle(ctx, borderSize, borderSize, 1024 - borderSize * 2, 1024 - borderSize * 2, Math.max(0, radius - borderSize));
    ctx.clip();

    // Fill with base theme color
    const themeColor = getBaseThemeColor();
    ctx.fillStyle = themeColor;
    ctx.fillRect(borderSize, borderSize, 1024 - borderSize * 2, 1024 - borderSize * 2);

    if (isGradientEnabled) {
        // Create gradients
        const spots = [
            { x: 256, y: 256 },
            { x: 768, y: 256 },
            { x: 256, y: 768 },
            { x: 768, y: 768 }
        ];

        const colors = [
            adjustColor(themeColor, 70),
            themeColor,
            themeColor,
            adjustColor(themeColor, -100)
        ];
        const gradientRadius = 1024;

        spots.forEach((spot, i) => {
            let gradient = ctx.createRadialGradient(
                spot.x, spot.y, 0,
                spot.x, spot.y, gradientRadius
            );
            
            gradient.addColorStop(0, colors[i]);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.globalCompositeOperation = 'screen';
            ctx.fillRect(borderSize, borderSize, 1024 - borderSize * 2, 1024 - borderSize * 2);
        });

        ctx.globalCompositeOperation = 'source-over';
    }

    // Draw the icon if selected
    if (selectedIcon) {
        const scale = iconScale / 100;  // Convert percentage to decimal
        const scaledSize = 1024 * scale;  // Scale the icon
        const x = (1024 - scaledSize) / 2;  // Center horizontally
        const y = (1024 - scaledSize) / 2;  // Center vertically

        // Create a temporary canvas for the icon
        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 1024;
        iconCanvas.height = 1024;
        const iconCtx = iconCanvas.getContext('2d');

        // Add drop shadow
        iconCtx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        iconCtx.shadowBlur = 20;
        iconCtx.shadowOffsetX = 10;
        iconCtx.shadowOffsetY = 10;

        // Draw the icon with current scale
        iconCtx.drawImage(selectedIcon, x, y, scaledSize, scaledSize);

        // Add grain to icon
        const imageData = iconCtx.getImageData(0, 0, 1024, 1024);
        const pixels = imageData.data;

        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 0) {
                const grainValue = (Math.random() - 0.5) * grainAmountIcon;
                pixels[i] = Math.min(255, Math.max(0, pixels[i] + grainValue));
                pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + grainValue));
                pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + grainValue));
            }
        }

        iconCtx.putImageData(imageData, 0, 0);

        // Draw the processed icon onto the main canvas
        ctx.drawImage(iconCanvas, 0, 0);
    }

    ctx.restore();

    // Step 4: Add grain effect
    addGrain();

    // Step 5: Add gradient outline
    let strokeGradient = ctx.createLinearGradient(0, 0, 1024, 1024);
    const borderThemeColor = getBaseThemeColor();
    strokeGradient.addColorStop(0, adjustColor(borderThemeColor, 100));
    strokeGradient.addColorStop(1, adjustColor(borderThemeColor, -50));
    ctx.strokeStyle = strokeGradient;
    ctx.lineWidth = borderSize;
    drawRoundedRectangle(ctx, borderSize / 2, borderSize / 2, 1024 - borderSize, 1024 - borderSize, radius - borderSize / 2);
    ctx.stroke();
}

// Load icon function
async function loadIcon(title) {
    const currentIcon = iconsData.find(icon => icon.title === title);
    if (!currentIcon) return null;

    const svgUrl = currentIcon.source;

    try {
        const response = await fetch(svgUrl);
        if (!response.ok) throw new Error('Failed to load icon');
        const svgText = await response.text();

        // Create a new image
        const img = new Image();
        
        // Create SVG blob with current color
        const color = currentTheme === 'color' ? iconColor : 
                     currentTheme === 'light' ? '#FFFFFF' : '#000000';
        
        const coloredSvg = svgText.replace(/(<path.*?)(fill=".*?")?(\s*\/>|<\/path>)/g, 
            (match, start, fill, end) => `${start} fill="${color}"${end}`);
        
        const blob = new Blob([coloredSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        return new Promise((resolve, reject) => {
            img.onload = () => {
                URL.revokeObjectURL(url);
                img.dataset.title = title;
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load icon'));
            };
            img.src = url;
        });
    } catch (error) {
        console.error('Error loading icon:', error);
        return null;
    }
}

// Initial draw
drawIcon();

// Add with other event listeners
const toggleIconBrowser = document.getElementById('toggleIconBrowser');
const iconBrowser = document.querySelector('.icon-browser');

toggleIconBrowser.addEventListener('click', function() {
    const isCollapsed = iconBrowser.classList.toggle('collapsed');
    this.classList.toggle('collapsed', isCollapsed);
});

