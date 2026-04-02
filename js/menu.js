(() => {
	const DEFAULT_BACKGROUND_COLOR = '#dde3fd';
	const PLANNER_CACHE_KEY = 'duikplanner_state_v2';
	const ABOUT_COLUMN_COLLAPSE_KEY = 'duikplanner_about_column_collapsed';

	function normalizeHexColor(colorValue) {
		if (typeof colorValue !== 'string') return null;
		const trimmed = colorValue.trim();

		if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) {
			return trimmed.toLowerCase();
		}

		if (/^#([0-9a-fA-F]{3})$/.test(trimmed)) {
			const red = trimmed[1];
			const green = trimmed[2];
			const blue = trimmed[3];
			return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase();
		}

		return null;
	}

	function clampNumber(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function hexToRgb(hexColor) {
		const normalizedColor = normalizeHexColor(hexColor);
		if (!normalizedColor) return null;

		return {
			r: parseInt(normalizedColor.slice(1, 3), 16),
			g: parseInt(normalizedColor.slice(3, 5), 16),
			b: parseInt(normalizedColor.slice(5, 7), 16)
		};
	}

	function rgbToHex(red, green, blue) {
		const toHex = value => clampNumber(Math.round(value), 0, 255).toString(16).padStart(2, '0');
		return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
	}

	function rgbToHsl(red, green, blue) {
		const r = red / 255;
		const g = green / 255;
		const b = blue / 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const delta = max - min;

		let hue = 0;
		if (delta !== 0) {
			if (max === r) {
				hue = ((g - b) / delta) % 6;
			} else if (max === g) {
				hue = (b - r) / delta + 2;
			} else {
				hue = (r - g) / delta + 4;
			}
		}

		hue = Math.round(hue * 60);
		if (hue < 0) hue += 360;

		const lightness = (max + min) / 2;
		const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

		return {
			h: hue,
			s: Math.round(saturation * 100),
			l: Math.round(lightness * 100)
		};
	}

	function hslToRgb(hue, saturation, lightness) {
		const h = ((hue % 360) + 360) % 360;
		const s = clampNumber(saturation, 0, 100) / 100;
		const l = clampNumber(lightness, 0, 100) / 100;

		const chroma = (1 - Math.abs(2 * l - 1)) * s;
		const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
		const m = l - chroma / 2;

		let redPrime = 0;
		let greenPrime = 0;
		let bluePrime = 0;

		if (h < 60) {
			redPrime = chroma;
			greenPrime = x;
		} else if (h < 120) {
			redPrime = x;
			greenPrime = chroma;
		} else if (h < 180) {
			greenPrime = chroma;
			bluePrime = x;
		} else if (h < 240) {
			greenPrime = x;
			bluePrime = chroma;
		} else if (h < 300) {
			redPrime = x;
			bluePrime = chroma;
		} else {
			redPrime = chroma;
			bluePrime = x;
		}

		return {
			r: Math.round((redPrime + m) * 255),
			g: Math.round((greenPrime + m) * 255),
			b: Math.round((bluePrime + m) * 255)
		};
	}

	function hslToHex(hue, saturation, lightness) {
		const rgbColor = hslToRgb(hue, saturation, lightness);
		return rgbToHex(rgbColor.r, rgbColor.g, rgbColor.b);
	}

	function getContrastTextColor(hexColor) {
		const rgbColor = hexToRgb(hexColor);
		if (!rgbColor) return '#ffffff';

		const hslColor = rgbToHsl(rgbColor.r, rgbColor.g, rgbColor.b);
		const isYellowTone = hslColor.h >= 42 && hslColor.h <= 74;

		// Prefer white text on colored backgrounds, but switch to dark text for very light colors.
		if (hslColor.l >= 74 || (isYellowTone && hslColor.l >= 58)) {
			return '#152234';
		}

		return '#ffffff';
	}

	function getLighterHexColor(hexColor, lightenRatio = 0.82) {
		const normalizedColor = normalizeHexColor(hexColor);
		if (!normalizedColor) return '#f3f6ff';

		const red = parseInt(normalizedColor.slice(1, 3), 16);
		const green = parseInt(normalizedColor.slice(3, 5), 16);
		const blue = parseInt(normalizedColor.slice(5, 7), 16);
		const ratio = Math.min(Math.max(lightenRatio, 0), 0.98);

		const lighterRed = Math.min(255, Math.round(red + (255 - red) * ratio));
		const lighterGreen = Math.min(255, Math.round(green + (255 - green) * ratio));
		const lighterBlue = Math.min(255, Math.round(blue + (255 - blue) * ratio));

		return rgbToHex(lighterRed, lighterGreen, lighterBlue).toLowerCase();
	}

	function createThemePalette(baseHexColor) {
		const baseRgb = hexToRgb(baseHexColor);
		if (!baseRgb) return null;

		const baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
		const accentSaturation = clampNumber(Math.max(baseHsl.s + 20, 44), 42, 88);
		// Scale lightness bounds upward for light backgrounds so tones stay in the same range as the background
		const lightnessBias = Math.max(0, Math.round((baseHsl.l - 62) * 0.55));
		const accentLightness = clampNumber(baseHsl.l > 62 ? baseHsl.l - 24 : 46, 34, 56 + lightnessBias);

		const accent = hslToHex(baseHsl.h, accentSaturation, accentLightness);
		const accentStrong = hslToHex(baseHsl.h, clampNumber(accentSaturation + 8, 48, 94), clampNumber(accentLightness - 12, 24, 44 + lightnessBias));
		const accentSoft = hslToHex(baseHsl.h, clampNumber(accentSaturation - 16, 18, 72), clampNumber(accentLightness + 28, 68, 90));
		const accentMuted = hslToHex(baseHsl.h, clampNumber(accentSaturation - 28, 10, 60), 95);
		const heading = hslToHex(baseHsl.h, clampNumber(accentSaturation - 6, 24, 82), clampNumber(accentLightness - 6, 28, 46 + Math.round(lightnessBias * 0.5)));
		const text = hslToHex(baseHsl.h, 22, 24);
		const textMuted = hslToHex(baseHsl.h, 10, 42);
		const border = hslToHex(baseHsl.h, 26, 84);
		const attention = hslToHex(baseHsl.h, clampNumber(accentSaturation + 4, 46, 92), clampNumber(accentLightness - 6, 28, 46 + lightnessBias));
		const attentionStrong = hslToHex(baseHsl.h, clampNumber(accentSaturation + 10, 50, 95), clampNumber(accentLightness - 18, 20, 38 + lightnessBias));
		const onAccent = getContrastTextColor(accent);
		const onAccentStrong = getContrastTextColor(accentStrong);
		const onAccentSoft = getContrastTextColor(accentSoft);
		const onAttention = getContrastTextColor(attention);
		const onAttentionStrong = getContrastTextColor(attentionStrong);

		const accentRgb = hexToRgb(accent);
		const accentStrongRgb = hexToRgb(accentStrong);
		const headingRgb = hexToRgb(heading);

		return {
			accent,
			accentStrong,
			accentSoft,
			accentMuted,
			heading,
			text,
			textMuted,
			border,
			onAccent,
			onAccentStrong,
			onAccentSoft,
			onAttention,
			onAttentionStrong,
			attention,
			attentionStrong,
			accentRgb: `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`,
			accentStrongRgb: `${accentStrongRgb.r}, ${accentStrongRgb.g}, ${accentStrongRgb.b}`,
			headingRgb: `${headingRgb.r}, ${headingRgb.g}, ${headingRgb.b}`
		};
	}

	function applyThemePalette(themePalette) {
		if (!themePalette) return;

		const rootStyle = document.documentElement.style;
		rootStyle.setProperty('--theme-accent', themePalette.accent);
		rootStyle.setProperty('--theme-accent-strong', themePalette.accentStrong);
		rootStyle.setProperty('--theme-accent-soft', themePalette.accentSoft);
		rootStyle.setProperty('--theme-accent-muted', themePalette.accentMuted);
		rootStyle.setProperty('--theme-heading', themePalette.heading);
		rootStyle.setProperty('--theme-text', themePalette.text);
		rootStyle.setProperty('--theme-text-muted', themePalette.textMuted);
		rootStyle.setProperty('--theme-border', themePalette.border);
		rootStyle.setProperty('--theme-button-text', themePalette.onAccentStrong);
		rootStyle.setProperty('--theme-on-accent', themePalette.onAccent);
		rootStyle.setProperty('--theme-on-accent-strong', themePalette.onAccentStrong);
		rootStyle.setProperty('--theme-on-accent-soft', themePalette.onAccentSoft);
		rootStyle.setProperty('--theme-on-attention', themePalette.onAttention);
		rootStyle.setProperty('--theme-on-attention-strong', themePalette.onAttentionStrong);
		rootStyle.setProperty('--theme-attention', themePalette.attention);
		rootStyle.setProperty('--theme-attention-strong', themePalette.attentionStrong);
		rootStyle.setProperty('--theme-accent-rgb', themePalette.accentRgb);
		rootStyle.setProperty('--theme-accent-strong-rgb', themePalette.accentStrongRgb);
		rootStyle.setProperty('--theme-heading-rgb', themePalette.headingRgb);
	}

	function applyBackgroundTheme(colorValue) {
		const normalizedColor = normalizeHexColor(colorValue) || DEFAULT_BACKGROUND_COLOR;
		const lighterColor = getLighterHexColor(normalizedColor);
		const themePalette = createThemePalette(normalizedColor);
		const gradientValue = `linear-gradient(135deg, ${lighterColor} 50%, ${normalizedColor} 100%)`;

		document.documentElement.style.setProperty('--page-bg-color', normalizedColor);
		document.documentElement.style.setProperty('--page-bg-color-light', lighterColor);
		applyThemePalette(themePalette);
		document.documentElement.style.background = gradientValue;
		document.body.style.background = gradientValue;

		const backgroundColorInput = document.querySelector('input[name="backgroundColor"]');
		if (backgroundColorInput) {
			backgroundColorInput.value = normalizedColor;
		}

		const backgroundColorSwatch = document.getElementById('backgroundColorSwatch');
		if (backgroundColorSwatch) {
			backgroundColorSwatch.style.backgroundColor = normalizedColor;
		}
	}

	function getCachedBackgroundColor() {
		try {
			const cachedData = localStorage.getItem(PLANNER_CACHE_KEY);
			if (!cachedData) return DEFAULT_BACKGROUND_COLOR;

			const parsedData = JSON.parse(cachedData);
			const cachedColor = normalizeHexColor(parsedData?.parameters?.backgroundColor)
				|| normalizeHexColor(parsedData?.backgroundColor);

			return cachedColor || DEFAULT_BACKGROUND_COLOR;
		} catch (error) {
			console.warn('Could not load cached theme color:', error);
			return DEFAULT_BACKGROUND_COLOR;
		}
	}

	function setupMenuToggle() {
		const toggleButton = document.getElementById('menuToggle');
		const menu = document.getElementById('siteMenu');

		if (!toggleButton || !menu) {
			return;
		}

		const closeMenu = () => {
			menu.hidden = true;
			toggleButton.classList.remove('open');
			toggleButton.setAttribute('aria-expanded', 'false');
		};

		const openMenu = () => {
			menu.hidden = false;
			toggleButton.classList.add('open');
			toggleButton.setAttribute('aria-expanded', 'true');
		};

		toggleButton.addEventListener('click', event => {
			event.stopPropagation();
			if (menu.hidden) {
				openMenu();
				return;
			}
			closeMenu();
		});

		menu.addEventListener('click', event => {
			event.stopPropagation();
		});

		document.addEventListener('click', () => {
			if (!menu.hidden) {
				closeMenu();
			}
		});

		document.addEventListener('keydown', event => {
			if (event.key === 'Escape') {
				closeMenu();
			}
		});
	}

	function setupAboutColumnToggle() {
		const toggleButton = document.getElementById('toggleAboutColumnBtn');
		if (!toggleButton) {
			return;
		}

		const mediaQuery = window.matchMedia('(min-width: 1024px)');

		const applyCollapsedState = (collapsed) => {
			document.body.classList.toggle('about-collapsed', collapsed);
			toggleButton.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
			toggleButton.setAttribute('aria-label', collapsed ? 'Toon info-kolom' : 'Verberg info-kolom');
			toggleButton.setAttribute('title', collapsed ? 'Toon info-kolom' : 'Verberg info-kolom');
		};

		const cachedCollapsed = localStorage.getItem(ABOUT_COLUMN_COLLAPSE_KEY) === 'true';
		if (mediaQuery.matches) {
			applyCollapsedState(cachedCollapsed);
		} else {
			applyCollapsedState(false);
		}

		toggleButton.addEventListener('click', () => {
			const nextCollapsed = !document.body.classList.contains('about-collapsed');
			applyCollapsedState(nextCollapsed);
			localStorage.setItem(ABOUT_COLUMN_COLLAPSE_KEY, String(nextCollapsed));
		});

		mediaQuery.addEventListener('change', event => {
			if (!event.matches) {
				applyCollapsedState(false);
				return;
			}

			const shouldCollapse = localStorage.getItem(ABOUT_COLUMN_COLLAPSE_KEY) === 'true';
			applyCollapsedState(shouldCollapse);
		});
	}

	document.addEventListener('DOMContentLoaded', () => {
		applyBackgroundTheme(getCachedBackgroundColor());
		setupMenuToggle();
		setupAboutColumnToggle();
	});
})();
