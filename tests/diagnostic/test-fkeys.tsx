#!/usr/bin/env node
import React from 'react';
import { render, Text, useInput } from 'ink';

function TestApp() {
    const [lastKey, setLastKey] = React.useState<string>('(none)');

    useInput((input, key) => {
        const info = JSON.stringify(
            {
                input,
                inputLen: input.length,
                inputHex: input
                    ? Array.from(input)
                          .map((c) => '0x' + c.charCodeAt(0).toString(16))
                          .join(' ')
                    : 'empty',
                keyProps: Object.keys(key).filter((k) => (key as any)[k] === true),
                allKeyProps: key,
            },
            null,
            2,
        );

        console.error('\n=== KEY EVENT ===');
        console.error(info);

        setLastKey(info);

        if (key.ctrl && input === 'q') {
            process.exit(0);
        }
    });

    return (
        <>
            <Text color="cyan" bold>
                Function Key Test
            </Text>
            <Text>Press F1-F6 to test, Ctrl+Q to quit</Text>
            <Text></Text>
            <Text color="yellow">Last key (check stderr for details):</Text>
            <Text dimColor>{lastKey.substring(0, 50)}...</Text>
        </>
    );
}

render(<TestApp />);
