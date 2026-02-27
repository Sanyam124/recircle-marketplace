export { };

declare global {
    interface Window {
        google: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    renderButton: (parent: HTMLElement | null, options: any) => void;
                };
            };
        };
    }
}
