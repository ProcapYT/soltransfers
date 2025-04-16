import readline from "node:readline/promises";

export async function input(question, hideCharacters = false) {
    if (hideCharacters) {
        return new Promise((resolve) => {
            process.stdout.write(question);
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            let input = '';

            const isPrintable = (char) => {
                // Filtra caracteres de control, permitiendo solo los imprimibles visibles
                return char >= ' ' && char <= '~'; // ASCII visible chars
            };

            const onData = (chunk) => {
                for (const char of chunk) {
                    // ENTER
                    if (char === '\r' || char === '\n') {
                        process.stdout.write('\n');
                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        process.stdin.removeListener('data', onData);
                        return resolve(input);
                    }

                    // Ctrl+C
                    if (char === '\u0003') {
                        process.stdout.write('\n');
                        process.exit();
                    }

                    // BACKSPACE
                    if (char === '\u007F' || char === '\b' || char === '\x08') {
                        if (input.length > 0) {
                            input = input.slice(0, -1);
                            process.stdout.write('\b \b');
                        }
                        continue;
                    }

                    // Saltar si no es imprimible (Ctrl, Tab, Esc, etc.)
                    if (!isPrintable(char)) {
                        continue;
                    }

                    // Agregar carácter válido
                    input += char;
                    process.stdout.write('*');
                }
            };

            process.stdin.on('data', onData);
        });
    }

    if (!hideCharacters) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const response = await rl.question(question);
        rl.close();
        return response;
    }
}
