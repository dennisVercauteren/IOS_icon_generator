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

// Load both icon libraries
async function loadIconLibraries() {
    try {
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

        // Select a random icon on load
        const randomIcon = brandsData[Math.floor(Math.random() * brandsData.length)];

        console.log(`Loaded ${brandsData.length} brand icons and ${remixData.length} remix icons`);

        // Display icons
        displayIcons(iconsData);

        // Load and display the random icon
        await loadIcon(randomIcon.title);

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
const borderWidth = 3;

// Theme variables
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
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(currentTheme + 'Btn').classList.add('active');
}

function updateBaseActiveButton() {
    document.querySelectorAll('.color-controls .theme-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('base' + currentBaseTheme.charAt(0).toUpperCase() + currentBaseTheme.slice(1) + 'Btn').classList.add('active');
}

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

function updateColor(color) {
    baseColor = color;
    if (currentBaseTheme === 'color') {
        drawIcon();
    }
}

function updateIconColor(color) {
    iconColor = color;
    if (currentTheme === 'color' && selectedIcon && selectedIcon.dataset && selectedIcon.dataset.title) {
        loadIcon(selectedIcon.dataset.title)
            .then(img => {
                selectedIcon = img;
                drawIcon();
            })
            .catch(err => console.error('Error updating icon color:', err));
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

// Function to trigger download
document.getElementById('downloadBtn').addEventListener('click', function () {
    if (!selectedIcon || !selectedIcon.dataset || !selectedIcon.dataset.title) {
        console.warn('No icon selected');
        return;
    }

    const iconTitle = selectedIcon.dataset.title;
    const link = document.createElement('a');
    const filename = `${iconTitle}.png`;

    const imageData = canvas.toDataURL('image/png', 0.8);

    link.download = filename;
    link.href = imageData;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

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

function drawIcon() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Step 1: Draw background with rounded corners
    ctx.save();
    ctx.beginPath();
    drawRoundedRectangle(ctx, 0, 0, 1024, 1024, radius);
    ctx.clip();

    // Fill with base theme color
    ctx.fillStyle = getBaseThemeColor();
    ctx.fillRect(0, 0, 1024, 1024);

    // Create gradients
    const spots = [
        { x: 256, y: 256 },
        { x: 768, y: 256 },
        { x: 256, y: 768 },
        { x: 768, y: 768 }
    ];

    const themeColor = getBaseThemeColor();
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
        ctx.fillRect(0, 0, 1024, 1024);
    });

    ctx.globalCompositeOperation = 'source-over';

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

        // Reset shadow settings
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    ctx.restore();

    // Step 4: Add grain effect
    addGrain();

    // Step 5: Add gradient outline
    let strokeGradient = ctx.createLinearGradient(
        0, 0,
        1024, 1024
    );
    const borderThemeColor = getBaseThemeColor();
    strokeGradient.addColorStop(0, adjustColor(borderThemeColor, 100));
    strokeGradient.addColorStop(1, adjustColor(borderThemeColor, -50));
    ctx.strokeStyle = strokeGradient;
    ctx.lineWidth = borderWidth;
    drawRoundedRectangle(
        ctx,
        borderWidth / 2,
        borderWidth / 2,
        1024 - borderWidth,
        1024 - borderWidth,
        radius - borderWidth / 2
    );
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
                     currentTheme === 'light' ? '#000000' : '#FFFFFF';
        
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
