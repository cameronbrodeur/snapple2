/**
 * Hook to track terminal dimensions.
 *
 * Listens for terminal resize events and returns current columns/rows.
 * Defaults to 80×24 if dimensions unavailable.
 */

import { useState, useEffect } from 'react';

export interface TerminalSize {
    columns: number;
    rows: number;
}

const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;

/**
 * Returns the current terminal size and updates on resize.
 */
export function useTerminalSize(): TerminalSize {
    const [size, setSize] = useState<TerminalSize>({
        columns: process.stdout.columns || DEFAULT_COLUMNS,
        rows: process.stdout.rows || DEFAULT_ROWS,
    });

    useEffect(() => {
        const handleResize = () => {
            setSize({
                columns: process.stdout.columns || DEFAULT_COLUMNS,
                rows: process.stdout.rows || DEFAULT_ROWS,
            });
        };

        process.stdout.on('resize', handleResize);
        return () => {
            process.stdout.off('resize', handleResize);
        };
    }, []);

    return size;
}
