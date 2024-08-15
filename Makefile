.PHONY: help setup format
.DEFAULT_GOAL := help
NAME := arma-player
VERSION := $(shell git show -s --format=%h)

help: # Display the application manual
	@echo "$(NAME) version \033[33m$(VERSION)\n\e[0m"
	@echo "\033[1;37mUSAGE\e[0m"
	@echo "  \e[4mmake\e[0m <command> [<arg1>] ... [<argN>]\n"
	@echo "\033[1;37mAVAILABLE COMMANDS\e[0m"
	@grep -E '^[a-zA-Z_-]+:.*?# .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?# "}; {printf "  \033[32m%-20s\033[0m %s\n", $$1, $$2}'

setup: # Setup dependencies and development configuration
	npm install
	docker compose up -d

format: # Run code style autoformatter
	prettier --write --cache --ignore-unknown --single-quote .
