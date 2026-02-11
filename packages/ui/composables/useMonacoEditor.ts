import type * as monacoedi from "monaco-editor";

/**
 * Detects the current theme from localStorage/cookie/DOM.
 * Returns the Shiki/Monaco theme name.
 */
function getThemeName(): string {
	if (typeof window === "undefined") return "catppuccin-latte";

	// 1. Check localStorage (set by ThemeToggle)
	const stored = localStorage.getItem("theme");
	if (stored) {
		return stored === "dark" ? "catppuccin-mocha" : "catppuccin-latte";
	}

	// 2. Check cookie (also set by ThemeToggle)
	if (typeof document !== "undefined") {
		const cookie = document.cookie
			.split("; ")
			.find((c) => c.startsWith("theme="));
		const cookieVal = cookie?.split("=")[1];
		if (cookieVal) {
			return cookieVal === "dark"
				? "catppuccin-mocha"
				: "catppuccin-latte";
		}
	}

	// 3. Check if dark class is on documentElement
	if (typeof document !== "undefined") {
		if (document.documentElement.classList.contains("dark")) {
			return "catppuccin-mocha";
		}
	}

	// 4. Fallback to system preference
	if (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches
	) {
		return "catppuccin-mocha";
	}

	return "catppuccin-latte";
}

// Reactive theme name — updated by setTheme() so options always stay in sync
const currentTheme = ref(
	typeof window !== "undefined" ? getThemeName() : "catppuccin-latte"
);

export const useMonacoEditor = () => {
	const options: monacoedi.editor.IStandaloneEditorConstructionOptions = {
		automaticLayout: true,
		cursorStyle: "block",
		formatOnPaste: true,
		formatOnType: true,
		lineNumbersMinChars: 3,
		minimap: {
			enabled: false,
		},
		scrollBeyondLastLine: false,
		scrollbar: {
			alwaysConsumeMouseWheel: false,
		},
		stickyScroll: {
			enabled: false,
		},
		// Set the initial theme so the editor doesn't flash white in dark mode
		// theme: getThemeName(),
	};

	const setTheme = async () => {
		const themeName = getThemeName();
		currentTheme.value = themeName;
		const monaco = await useMonaco();
		if (monaco) {
			monaco.editor.setTheme(themeName);
		}
	};

	const setEditorMarker = async (
		model: monacoedi.editor.ITextModel | null,
		errors: monacoedi.editor.IMarkerData[]
	) => {
		const monaco = await useMonaco();
		if (monaco && model && errors) {
			monaco.editor.setModelMarkers(model, model.uri.toString(), errors);
		}
	};

	return {
		options,
		getThemeName,
		setTheme,
		setEditorMarker,
	};
};
