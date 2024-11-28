// Icons data and search index
let iconsData = [];
let searchIndex = {};
let searchCache = new Map();

// Fetch icons data from the local JSON file
fetch('simple-icons.json')
  .then(response => response.json())
  .then(data => {
    iconsData = data.icons;
    // Build search index
    buildSearchIndex();
    console.log(`Loaded ${iconsData.length} icons`);
  })
  .catch(error => console.error('Error loading icons:', error));

// Build an efficient search index
function buildSearchIndex() {
  iconsData.forEach((icon, index) => {
    const words = icon.title.toLowerCase().split(/\s+/);
    words.forEach(word => {
      for (let i = 1; i <= word.length; i++) {
        const prefix = word.slice(0, i);
        if (!searchIndex[prefix]) {
          searchIndex[prefix] = new Set();
        }
        searchIndex[prefix].add(index);
      }
    });
  });
}

// Search functionality
const searchInput = document.getElementById('iconSearch');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', debounce(handleSearch, 150));

function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  if (searchTerm.length < 2) {
    searchResults.classList.remove('active');
    return;
  }

  // Check cache first
  const cacheKey = searchTerm;
  if (searchCache.has(cacheKey)) {
    displayResults(searchCache.get(cacheKey));
    return;
  }

  // Get matching indices from search index
  const words = searchTerm.split(/\s+/);
  let matchingIndices = new Set();
  let isFirst = true;

  words.forEach(word => {
    const indices = searchIndex[word] || new Set();
    if (isFirst) {
      matchingIndices = new Set(indices);
      isFirst = false;
    } else {
      matchingIndices = new Set([...matchingIndices].filter(x => indices.has(x)));
    }
  });

  // Convert indices to actual results
  const matches = Array.from(matchingIndices)
    .map(index => iconsData[index])
    .filter(icon => icon.title.toLowerCase().includes(searchTerm))
    .slice(0, 10);

  // Cache the results
  searchCache.set(cacheKey, matches);
  
  // Display results
  displayResults(matches);
}

function displayResults(matches) {
  if (matches.length > 0) {
    searchResults.innerHTML = matches.map(icon => `
      <div class="search-result-item" data-slug="${icon.title}">
        <div style="width: 24px; height: 24px; background-color: #${icon.hex}; border-radius: 4px;"></div>
        ${icon.title}
      </div>
    `).join('');
    searchResults.classList.add('active');

    // Add click handlers to results
    attachSearchResultHandlers();
  } else {
    searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
    searchResults.classList.add('active');
  }
}

function attachSearchResultHandlers() {
  searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const title = item.dataset.slug;
      const iconData = iconsData.find(icon => icon.title === title);
      
      // Set both base and icon colors to the icon's color
      baseColor = `#${iconData.hex}`;
      iconColor = baseColor;
      
      // Update both color pickers
      document.getElementById('colorPicker').value = baseColor;
      document.getElementById('iconColorPicker').value = iconColor;
      
      // Load the icon
      loadIcon(title)
        .then(img => {
          selectedIcon = img;
          drawIcon();
          searchResults.classList.remove('active');
          searchInput.value = item.textContent.trim();
        })
        .catch(err => console.error('Error loading icon:', err));
    });
  });
}

// Get canvas and context
const canvas = document.getElementById('iconCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Default values
let baseColor = '#3498db';  // Actual color for color picker
let iconColor = '#3498db';  // Actual color for icon color picker
let radius = 125;
let iconScale = 70;  // Icon scale percentage (30-100)
let grainAmount = 35;
let grainAmountIcon = 15;
const borderWidth = 3;
const iconSize = 1024 * 0.7;  // Base icon size before scaling

// Icon variables
let selectedIcon = null;

// Theme variables
let currentTheme = 'color';
let currentBaseTheme = 'color';
const lightColor = '#f0f0f0';
const darkColor = '#1a1a1a';

function getBaseThemeColor() {
    switch(currentBaseTheme) {
        case 'light': return lightColor;
        case 'dark': return darkColor;
        case 'color': return baseColor;
        default: return baseColor;
    }
}

function getIconColor() {
    switch(currentTheme) {
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
    
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.style.display = theme === 'color' ? 'block' : 'none';
    
    if (theme === 'color') {
        colorPicker.value = baseColor;
        colorPicker.click();
    }
    
    drawIcon();
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

function setTheme(theme) {
    currentTheme = theme;
    updateActiveButton();
    
    const iconColorPicker = document.getElementById('iconColorPicker');
    iconColorPicker.style.display = theme === 'color' ? 'block' : 'none';
    
    if (theme === 'color') {
        iconColorPicker.value = iconColor;
        iconColorPicker.click();
    }
    
    // Always reload the icon if one is selected
    if (selectedIcon && selectedIcon.dataset && selectedIcon.dataset.title) {
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
const colorPicker = document.getElementById('colorPicker');
colorPicker.addEventListener('input', (e) => {
    if (baseColor !== e.target.value) {
        baseColor = e.target.value;
        debouncedDraw();
    }
});

// Icon color picker
const iconColorPicker = document.getElementById('iconColorPicker');
iconColorPicker.addEventListener('input', (e) => {
    if (iconColor !== e.target.value) {
        iconColor = e.target.value;
        updateIconColor(iconColor);
    }
});

// Radius slider
const radiusSlider = document.getElementById('radiusSlider');
radiusSlider.addEventListener('input', (e) => {
    if (radius !== parseInt(e.target.value)) {
        radius = parseInt(e.target.value);
        debouncedDraw();
    }
});

// Grain slider
const grainSlider = document.getElementById('grainSlider');
grainSlider.addEventListener('input', (e) => {
    if (grainAmount !== parseInt(e.target.value)) {
        grainAmount = parseInt(e.target.value);
        debouncedDraw();
    }
});

// Function to trigger download
function downloadIcon(iconTitle, variant) {
    const link = document.createElement('a');
    const filename = variant ? `${iconTitle}_${variant}.png` : `${iconTitle}.png`;
    
    // Get the canvas data
    const imageData = canvas.toDataURL('image/png', 0.8);
    
    // Create download link
    link.download = filename;
    link.href = imageData;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Single download button handler
document.getElementById('downloadBtn').addEventListener('click', async function() {
    if (!selectedIcon || !selectedIcon.dataset || !selectedIcon.dataset.title) {
        console.warn('No icon selected');
        return;
    }
    
    const iconTitle = selectedIcon.dataset.title;
    downloadIcon(iconTitle);
});

// Download variants button handler
document.getElementById('downloadVariantsBtn').addEventListener('click', async function() {
    if (!selectedIcon || !selectedIcon.dataset || !selectedIcon.dataset.title) {
        console.warn('No icon selected');
        return;
    }
    
    const iconTitle = selectedIcon.dataset.title;
    const button = this;
    const originalText = button.textContent;
    
    try {
        // Disable button during processing
        button.disabled = true;
        
        // Get icon's preferred color
        const iconsDataResponse = await fetch('simple-icons.json');
        const iconsData = await iconsDataResponse.json();
        const iconData = iconsData.find(icon => 
            icon.title.toLowerCase() === iconTitle.toLowerCase()
        );

        if (!iconData) {
            throw new Error('No icon data found');
        }

        const preferredColor = `#${iconData.hex}`;
        
        // Store original colors
        const originalBaseColor = baseColor;
        const originalIconColor = iconColor;
        
        // Generate all variants
        const variants = [
            { name: 'color-light', baseColor: preferredColor, iconColor: '#ffffff' },
            { name: 'color-dark', baseColor: preferredColor, iconColor: '#000000' },
            { name: 'light-color', baseColor: '#ffffff', iconColor: preferredColor },
            { name: 'dark-color', baseColor: '#000000', iconColor: preferredColor },
            { name: 'light-dark', baseColor: '#ffffff', iconColor: '#000000' },
            { name: 'dark-light', baseColor: '#000000', iconColor: '#ffffff' }
        ];
        
        // Generate each variant
        for (const variant of variants) {
            baseColor = variant.baseColor;
            iconColor = variant.iconColor;
            
            // Update color pickers
            document.getElementById('colorPicker').value = baseColor;
            document.getElementById('iconColorPicker').value = iconColor;
            
            // Draw and trigger download
            drawIcon();
            downloadIcon(iconTitle, variant.name);
            
            // Small delay to prevent browser from blocking downloads
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Restore original colors
        baseColor = originalBaseColor;
        iconColor = originalIconColor;
        document.getElementById('colorPicker').value = baseColor;
        document.getElementById('iconColorPicker').value = iconColor;
        drawIcon();
        
        button.textContent = 'Variants Downloaded!';
        setTimeout(() => {
            button.disabled = false;
            button.textContent = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('Error generating variants:', error);
        button.textContent = 'Error! Try again';
        setTimeout(() => {
            button.disabled = false;
            button.textContent = originalText;
        }, 2000);
    }
});

// Icon scale slider
const iconScaleSlider = document.getElementById('iconScaleSlider');
iconScaleSlider.addEventListener('input', (e) => {
    iconScale = parseInt(e.target.value);
    drawIcon();
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
    // Alpha channel remains unchanged
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

  // Create 4 radial gradients, one in each corner
  const spots = [
    { x: 256, y: 256 },  // Top-left (lighter)
    { x: 768, y: 256 },  // Top-right (base color)
    { x: 256, y: 768 },  // Bottom-left (base color)
    { x: 768, y: 768 }   // Bottom-right (darker)
  ];

  const themeColor = getBaseThemeColor();
  const colors = [
    adjustColor(themeColor, 70),   // Spot 1: lighter
    themeColor,                    // Spot 2: base color
    themeColor,                    // Spot 3: base color
    adjustColor(themeColor, -100)  // Spot 4: darker
  ];
  const gradientRadius = 1024;

  spots.forEach((spot, i) => {
    let gradient = ctx.createRadialGradient(
      spot.x, spot.y, 0,         // Inner circle
      spot.x, spot.y, gradientRadius // Outer circle
    );

    gradient.addColorStop(0, colors[i]);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillRect(0, 0, 1024, 1024);
  });

  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over';

  // Draw the icon if selected
  if (selectedIcon) {
    const scale = iconScale / 100;  // Convert percentage to decimal
    const scaledSize = 1024 * scale;  // Scale the icon
    const x = (1024 - scaledSize) / 2;
    const y = (1024 - scaledSize) / 2;

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
        if (pixels[i + 3] > 0) {  // Only add grain to non-transparent pixels
            const grainValue = (Math.random() - 0.5) * grainAmountIcon;
            pixels[i] = Math.min(255, Math.max(0, pixels[i] + grainValue));     // R
            pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + grainValue)); // G
            pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + grainValue)); // B
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

  // Step 5: Add gradient outline inside the shape
  let strokeGradient = ctx.createLinearGradient(
    0, 0,           // Start point (top-left)
    1024, 1024      // End point (bottom-right)
  );
  const borderThemeColor = getBaseThemeColor();
  strokeGradient.addColorStop(0, adjustColor(borderThemeColor, 100)); // Lighter shade
  strokeGradient.addColorStop(1, adjustColor(borderThemeColor, -50));  // Darker shade
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
function loadIcon(iconTitle) {
    return new Promise((resolve, reject) => {
        // Remove spaces and convert to lowercase for filename
        const filename = iconTitle.toLowerCase().replace(/\s+/g, '');
        fetch(`https://raw.githubusercontent.com/simple-icons/simple-icons/refs/heads/develop/icons/${filename}.svg`)
            .then(response => response.text())
            .then(svgText => {
                const iconColor = getIconColor();
                // Modify SVG to use the selected color
                const coloredSvg = svgText
                    .replace(/<svg[^>]*>/, match => {
                        // Add fill attribute to SVG tag if not present
                        return match.includes('fill=') 
                            ? match.replace(/fill="[^"]*"/, `fill="${iconColor}"`)
                            : match.replace('>', ` fill="${iconColor}">`);
                    })
                    .replace(/fill="[^"]*"/g, `fill="${iconColor}"`)
                    .replace(/style="[^"]*fill:[^;]*;/g, `style="fill:${iconColor};`);
                
                // Create SVG blob
                const blob = new Blob([coloredSvg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                
                // Load the SVG image
                const img = new Image();
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    selectedIcon = img;
                    if (selectedIcon.dataset) {
                        selectedIcon.dataset.title = iconTitle;
                    }
                    resolve(img);
                };
                img.onerror = reject;
                img.src = url;
            })
            .catch(reject);
    });
}

// Function to generate all variants for all icons
async function generateAllIcons() {
    const generateButton = document.getElementById('generateAll');
    const originalText = generateButton.textContent;
    let successCount = 0;
    let failedIcons = [];
    let totalIcons = 0;
    
    try {
        // Disable all buttons during processing
        const buttons = document.querySelectorAll('.button-container button');
        buttons.forEach(button => button.disabled = true);
        
        // Get list of all icons
        const response = await fetch('/all-icons');
        const icons = await response.json();
        totalIcons = icons.length;
        
        // Cache the icons data to avoid multiple fetches
        const iconsDataResponse = await fetch('simple-icons.json');
        const iconsData = await iconsDataResponse.json();
        
        // Process each icon
        for (let i = 0; i < icons.length; i++) {
            const iconTitle = icons[i].replace('.svg', '');
            generateButton.textContent = `Processing ${i + 1}/${totalIcons}: ${iconTitle}`;
            
            try {
                // Store original colors
                const originalBaseColor = baseColor;
                const originalIconColor = iconColor;
                
                // Get icon's preferred color
                const iconData = iconsData.find(icon => 
                    icon.title.toLowerCase() === iconTitle.toLowerCase()
                );

                if (!iconData) {
                    console.error(`No data found for ${iconTitle}`);
                    failedIcons.push({ icon: iconTitle, error: 'No icon data found' });
                    continue;
                }

                const preferredColor = `#${iconData.hex}`;
                
                // Generate all variants
                const variants = [
                    { name: 'color-light', baseColor: preferredColor, iconColor: '#ffffff' },
                    { name: 'color-dark', baseColor: preferredColor, iconColor: '#000000' },
                    { name: 'light-color', baseColor: '#ffffff', iconColor: preferredColor },
                    { name: 'dark-color', baseColor: '#000000', iconColor: preferredColor },
                    { name: 'light-dark', baseColor: '#ffffff', iconColor: '#000000' },
                    { name: 'dark-light', baseColor: '#000000', iconColor: '#ffffff' }
                ];
                
                // Load the icon
                await loadIcon(iconTitle);
                
                // Generate each variant
                for (const variant of variants) {
                    baseColor = variant.baseColor;
                    iconColor = variant.iconColor;
                    
                    // Update color pickers
                    document.getElementById('colorPicker').value = baseColor;
                    document.getElementById('iconColorPicker').value = iconColor;
                    
                    // Draw and save
                    drawIcon();
                    downloadIcon(iconTitle, variant.name);
                }
                
                // Restore original colors
                baseColor = originalBaseColor;
                iconColor = originalIconColor;
                document.getElementById('colorPicker').value = baseColor;
                document.getElementById('iconColorPicker').value = iconColor;
                
                successCount++;
                
            } catch (error) {
                console.error(`Error processing ${iconTitle}:`, error);
                failedIcons.push({ icon: iconTitle, error: error.message });
            }
        }
        
        // Show completion message with details
        const failedCount = failedIcons.length;
        generateButton.textContent = `Completed! ${successCount}/${totalIcons} icons processed`;
        
        if (failedCount > 0) {
            console.log('Failed icons:', failedIcons);
            generateButton.textContent += ` (${failedCount} failed)`;
        }
        
        // Re-enable all buttons after 3 seconds
        setTimeout(() => {
            buttons.forEach(button => button.disabled = false);
            generateButton.textContent = originalText;
        }, 3000);
        
    } catch (error) {
        console.error('Error generating all icons:', error);
        generateButton.textContent = 'Error! Try again';
        
        // Re-enable all buttons
        document.querySelectorAll('.button-container button').forEach(button => button.disabled = false);
    }
}

// Add click handler for generate all button
document.getElementById('generateAll').addEventListener('click', generateAllIcons);

// Initial draw
drawIcon();

// Close search results when clicking outside
document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
    searchResults.classList.remove('active');
  }
});
