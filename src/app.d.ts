// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: {
				id: string;
				role: string;
				name: string;
				phone: string;
			};
		}
	}

	interface KTComponents {
		init(): void;
	}
	var KTComponents: KTComponents;
}

export {};
