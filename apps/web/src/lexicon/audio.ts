// Sound and touch settings: the speaker toggle and its three switches. Short and plain.

export const audio = {
	/** Rows of the settings list; `sound` is also the speaker toggle's name (aria-pressed says on/off). */
	sound: "Sound",
	ambient: "Cathedral air",
	haptics: "Vibration",
	/** Under Cathedral air while Sound is off. */
	needsSound: "Turn Sound on first",
	/** Colophon line for the sounds and the speaker icon. */
	creditsHead: "Sounds",
} as const;
