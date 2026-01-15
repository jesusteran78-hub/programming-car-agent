const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const Anthropic = require("@anthropic-ai/sdk");
require("dotenv").config();

const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required");
    process.exit(1);
}

const anthropic = new Anthropic({
    apiKey: API_KEY,
});

const server = new Server(
    {
        name: "claude-bridge",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "ask_claude",
                description: "Ask Claude a question or give it a task. This uses the Anthropic API.",
                inputSchema: {
                    type: "object",
                    properties: {
                        prompt: {
                            type: "string",
                            description: "The prompt or question for Claude",
                        },
                        model: {
                            type: "string",
                            description: "Model to use (default: claude-3-5-sonnet-20241022)",
                            default: "claude-3-5-sonnet-20241022"
                        }
                    },
                    required: ["prompt"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "ask_claude") {
        const { prompt, model = "claude-3-5-sonnet-20241022" } = request.params.arguments;

        try {
            const response = await anthropic.messages.create({
                model: model,
                max_tokens: 2048,
                messages: [{ role: 'user', content: prompt }],
            });

            const text = response.content[0].text;

            return {
                content: [
                    {
                        type: "text",
                        text: text,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error calling Claude: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }

    throw new Error("Tool not found");
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
