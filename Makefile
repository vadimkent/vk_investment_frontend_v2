.PHONY: run build test lint health info clean

run:
	pnpm dev

build:
	pnpm build

test:
	pnpm vitest run --reporter=json

lint:
	pnpm eslint . && pnpm prettier --check .

info:
	@echo '{"command":"info","status":"success","summary":"vk-investment-frontend-v2","details":{"name":"vk-investment-frontend-v2","stack":"typescript","framework":"nextjs"}}'

clean:
	rm -rf .next/ node_modules/
