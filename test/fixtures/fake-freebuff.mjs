process.stdout.write("Freebuff\r\nEnter a coding task or / for commands");
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on("data", (chunk) => {
  const input = chunk.toString();
  if (input.includes("\u0003")) {
    process.stdout.write(
      "\u001b[2JInterrupted\r\nEnter a coding task or / for commands",
    );
    return;
  }
  if (!input.includes("\r")) return;
  process.stdout.write("\u001b[2JEsc to interrupt\r\nWorking");
  setTimeout(() => {
    process.stdout.write(
      "\u001b[2JFREEBUFF_PASEO_OK\r\nEnter a coding task or / for commands",
    );
  }, 500);
});
