# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an automatic meal planner website that generates daily meal plans based on available ingredients. The system learns cooking methods from the internet, categorizes foods by meal type (breakfast, lunch, dinner, side dishes, snacks), and creates meal plans for specific periods.

Key features:
- Database of cookable dishes with ingredients and cooking methods
- Meal plan generation by calendar view
- Ingredient cost calculation for generated meal plans
- Visual indicators for days with planned meals
- Internet-based recipe learning system
- Randomized meal selection from registered recipes
- Calendar-based visualization with visual markers

## Development Environment Guidelines

- Web-based application using appropriate languages for functionality
- Database: MariaDB (already installed on local machine)
- Planning and design phase is prioritized before implementation
- Sub-agents should be utilized for specific roles and tasks
- CLAUDE.md file should not exceed 450 lines
- Code files should not exceed 3000 steps with ~5% buffer
- Modularization should be considered to prevent lengthy code
- Error handling and safety measures should be implemented
- All new files must include descriptive comments about their purpose
- Modification history should be tracked in code_update.md
- Conversation history should be summarized in talk_history.md
- Comments should be written in Korean with detailed explanations
- Avoid using 'any' or 'unknown' types; perform type checking
- Analysis and reporting files should follow naming convention: content_version_datetime.md
- Folder creation requires accompanying guide files
- Project files and folders should be managed in a single directory
- Files should be organized by function rather than combining multiple features
- Use stable, well-known technologies rather than latest features
- Always include purpose descriptions when creating files
- Extensive planning should precede any coding implementation
- Plans should be reviewed and reoptimized iteratively

## Technology Stack

- Backend: Node.js with Express.js
- Database: MariaDB
- Frontend: EJS templating engine
- Additional libraries: dotenv for environment variables

## Project Structure

```
src/
├── controllers/     # Request handlers
├── models/          # Database models and queries
├── routes/          # URL route definitions
├── services/        # Business logic
├── utils/           # Helper functions
├── views/           # EJS templates
└── app.js           # Main application entry point
public/
├── css/             # Stylesheets
├── js/              # Client-side JavaScript
└── images/          # Static images
docs/
├── database_schema.md  # Database structure documentation
├── planning/        # Planning documents
└── reports/         # Analysis and reporting files
```

## Common Commands

### Development
- `npm run dev` - Start development server with nodemon for auto-reload on port 5000
- `npm start` - Start production server on port 5000

### Testing
- `npm test` - Run all tests with Jest

### Database Setup
- Configure database connection in `.env` file
- Use MariaDB as specified in requirements
- Refer to `docs/database_schema.md` for table structures

## Architecture Overview

The application follows a modified MVC pattern:

1. **Frontend Layer** (`views/`)
   - EJS templates for rendering meal plans and calendar interface
   - CSS/JavaScript for interactive calendar visualization
   - Visual indicators for planned/unplanned days (cleaver and knife icons for planned days)
   - Calendar interface with clickable dates to view meal plans

2. **Controller Layer** (`controllers/`)
   - Handles HTTP requests and responses
   - Delegates business logic to services
   - Manages recipe registration and categorization
   - Handles calendar view requests

3. **Service Layer** (`services/`)
   - Core business logic for meal planning
   - Recipe management and categorization (breakfast, lunch, dinner, side dishes, snacks)
   - Calendar-based meal plan generation for requested periods
   - Ingredient cost calculation with data refresh capability
   - Internet-based recipe learning functionality
   - Randomized meal selection from available recipes

4. **Model Layer** (`models/`)
   - Database interactions with MariaDB
   - Data models for recipes, ingredients, meal plans, and costs
   - Cost data retrieval and updates
   - Calendar data management

5. **Routing Layer** (`routes/`)
   - URL endpoint definitions
   - Request routing to appropriate controllers
   - Recipe registration endpoints
   - Calendar view endpoints
   - Meal plan generation endpoints

Data flows from the database through models to services, then to controllers, and finally to views for rendering. External recipe learning functionality integrates at the service layer to fetch and process cooking methods and ingredients from the internet.

## Planning Process

Before implementing any code, follow these planning steps:

1. Create detailed requirements analysis in `docs/planning/requirements_analysis.md`
2. Design system architecture in `docs/planning/architecture_design.md`
3. Plan database schema (refer to `docs/database_schema.md`)
4. Create API design document in `docs/planning/api_design.md`
5. Develop UI/UX wireframes in `docs/planning/ui_design.md`
6. Review and optimize the plan iteratively
7. Get approval before proceeding to implementation

All planning documents should be reviewed and approved before any coding begins.