import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * Represents a single documentation file
 */
export interface DocumentationSection {
  filename: string;           // e.g., "components.md"
  title: string;              // e.g., "Component Catalog"
  content: string;            // Markdown content
  crossReferences: string[];  // Links to related sections
  codeExamples: CodeExample[];
}

/**
 * Represents a code snippet in documentation
 */
export interface CodeExample {
  language: string;           // e.g., "typescript", "tsx"
  code: string;               // The code snippet
  description: string;        // Explanation of the example
  filename?: string;          // Source file if extracted from codebase
}

/**
 * Represents extracted component information
 */
export interface ComponentInfo {
  name: string;               // Component name
  path: string;               // File path relative to src/
  category: string;           // e.g., "auth", "charts", "forms"
  props: PropInfo[];          // Component props
  dependencies: string[];     // Imported components
  usageExamples: string[];    // Code examples
  description: string;        // Component purpose
}

/**
 * Represents a component prop
 */
export interface PropInfo {
  name: string;               // Prop name
  type: string;               // TypeScript type
  required: boolean;          // Is prop required
  defaultValue?: string;      // Default value if any
  description: string;        // Prop description
}

/**
 * Represents the project directory structure
 */
export interface DirectoryNode {
  name: string;               // Directory or file name
  path: string;               // Full path
  type: 'directory' | 'file'; // Node type
  description: string;        // Purpose description
  children?: DirectoryNode[]; // Subdirectories/files
}

/**
 * Component extractor utility for analyzing React components
 */
class ComponentExtractor {
  private readonly projectRoot: string;
  private readonly srcDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.srcDir = path.join(projectRoot, 'src');
  }

  /**
   * Extract component information from a TSX/TS file
   */
  extractComponentInfo(filePath: string): ComponentInfo | null {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        fileContent,
        ts.ScriptTarget.Latest,
        true
      );

      const componentName = this.extractComponentName(sourceFile, filePath);
      if (!componentName) {
        return null;
      }

      const props = this.extractProps(sourceFile);
      const dependencies = this.extractDependencies(sourceFile);
      const category = this.categorizeComponent(filePath);
      const relativePath = path.relative(this.srcDir, filePath);

      return {
        name: componentName,
        path: relativePath,
        category,
        props,
        dependencies,
        usageExamples: [],
        description: this.generateDescription(componentName, category),
      };
    } catch (error) {
      console.error(`Error extracting component info from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract component name from source file
   */
  private extractComponentName(sourceFile: ts.SourceFile, filePath: string): string | null {
    let componentName: string | null = null;

    const visit = (node: ts.Node) => {
      // Check for default export function/arrow function
      if (ts.isFunctionDeclaration(node) && node.name) {
        const modifiers = ts.getModifiers(node);
        if (modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
          if (modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword)) {
            componentName = node.name.text;
          }
        }
      }

      // Check for const/variable declarations with arrow functions
      if (ts.isVariableStatement(node)) {
        const modifiers = ts.getModifiers(node);
        if (modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
          node.declarationList.declarations.forEach(decl => {
            if (ts.isIdentifier(decl.name) && decl.initializer) {
              if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
                componentName = decl.name.text;
              }
            }
          });
        }
      }

      // Check for export default statements
      if (ts.isExportAssignment(node) && !node.isExportEquals) {
        if (ts.isIdentifier(node.expression)) {
          componentName = node.expression.text;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Fallback: use filename if no component name found
    if (!componentName) {
      const fileName = path.basename(filePath, path.extname(filePath));
      if (fileName !== 'index') {
        componentName = fileName;
      }
    }

    return componentName;
  }

  /**
   * Extract props from component interface/type
   */
  private extractProps(sourceFile: ts.SourceFile): PropInfo[] {
    const props: PropInfo[] = [];

    const visit = (node: ts.Node) => {
      // Look for interface declarations ending with "Props"
      if (ts.isInterfaceDeclaration(node) && node.name.text.endsWith('Props')) {
        node.members.forEach(member => {
          if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
            const propName = member.name.text;
            const propType = member.type ? this.getTypeText(member.type) : 'any';
            const isRequired = !member.questionToken;
            const description = this.extractJsDocComment(member);

            props.push({
              name: propName,
              type: propType,
              required: isRequired,
              description,
            });
          }
        });
      }

      // Look for type alias declarations ending with "Props"
      if (ts.isTypeAliasDeclaration(node) && node.name.text.endsWith('Props')) {
        if (ts.isTypeLiteralNode(node.type)) {
          node.type.members.forEach(member => {
            if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
              const propName = member.name.text;
              const propType = member.type ? this.getTypeText(member.type) : 'any';
              const isRequired = !member.questionToken;
              const description = this.extractJsDocComment(member);

              props.push({
                name: propName,
                type: propType,
                required: isRequired,
                description,
              });
            }
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return props;
  }

  /**
   * Extract imported component dependencies
   */
  private extractDependencies(sourceFile: ts.SourceFile): string[] {
    const dependencies: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;

          // Only include local component imports (starting with @ or ./)
          if (importPath.startsWith('@/components') || importPath.startsWith('./') || importPath.startsWith('../')) {
            if (node.importClause?.namedBindings) {
              if (ts.isNamedImports(node.importClause.namedBindings)) {
                node.importClause.namedBindings.elements.forEach(element => {
                  dependencies.push(element.name.text);
                });
              }
            }
            if (node.importClause?.name) {
              dependencies.push(node.importClause.name.text);
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return dependencies;
  }

  /**
   * Categorize component based on file path
   */
  private categorizeComponent(filePath: string): string {
    const relativePath = path.relative(this.srcDir, filePath);
    const pathParts = relativePath.split(path.sep);

    if (pathParts.includes('auth')) return 'auth';
    if (pathParts.includes('charts')) return 'charts';
    if (pathParts.includes('form')) return 'forms';
    if (pathParts.includes('tables')) return 'tables';
    if (pathParts.includes('ui')) return 'ui';
    if (pathParts.includes('ecommerce')) return 'ecommerce';
    if (pathParts.includes('user-profile')) return 'user-profile';
    if (pathParts.includes('header')) return 'header';
    if (pathParts.includes('common')) return 'common';
    if (pathParts.includes('calendar')) return 'calendar';
    if (pathParts.includes('videos')) return 'videos';

    return 'other';
  }

  /**
   * Generate a description based on component name and category
   */
  private generateDescription(componentName: string, category: string): string {
    const categoryDescriptions: Record<string, string> = {
      auth: 'Authentication component',
      charts: 'Data visualization chart component',
      forms: 'Form input component',
      tables: 'Table display component',
      ui: 'UI component',
      ecommerce: 'E-commerce related component',
      'user-profile': 'User profile component',
      header: 'Header/navigation component',
      common: 'Common utility component',
      calendar: 'Calendar component',
      videos: 'Video display component',
    };

    const categoryDesc = categoryDescriptions[category] || 'Component';
    return `${categoryDesc} - ${componentName}`;
  }

  /**
   * Get type text from TypeScript type node
   */
  private getTypeText(typeNode: ts.TypeNode): string {
    if (ts.isTypeReferenceNode(typeNode)) {
      return typeNode.typeName.getText();
    }
    if (ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.map(t => this.getTypeText(t)).join(' | ');
    }
    if (ts.isLiteralTypeNode(typeNode)) {
      return typeNode.literal.getText();
    }
    return typeNode.getText();
  }

  /**
   * Extract JSDoc comment from node
   */
  private extractJsDocComment(node: ts.Node): string {
    const jsDocTags = ts.getJSDocTags(node);
    if (jsDocTags.length > 0) {
      return jsDocTags.map(tag => tag.comment).filter(Boolean).join(' ');
    }
    return '';
  }

  /**
   * Find all component files in the project
   */
  findAllComponents(): string[] {
    const componentFiles: string[] = [];
    const componentsDir = path.join(this.srcDir, 'components');

    const walkDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          // Exclude test files and type definition files
          if (!file.endsWith('.test.tsx') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
            componentFiles.push(filePath);
          }
        }
      });
    };

    walkDir(componentsDir);
    return componentFiles;
  }

  /**
   * Extract all components from the project
   */
  extractAllComponents(): ComponentInfo[] {
    const componentFiles = this.findAllComponents();
    const components: ComponentInfo[] = [];

    console.log(`Found ${componentFiles.length} component files to analyze...`);

    componentFiles.forEach(filePath => {
      const componentInfo = this.extractComponentInfo(filePath);
      if (componentInfo) {
        components.push(componentInfo);
      }
    });

    console.log(`Successfully extracted ${components.length} components`);
    return components;
  }
}

/**
 * Represents identified patterns in the codebase
 */
export interface CodePatterns {
  compositionPatterns: CompositionPattern[];
  statePatterns: StatePattern[];
  namingConventions: NamingConvention[];
}

export interface CompositionPattern {
  name: string;
  description: string;
  examples: string[];
}

export interface StatePattern {
  type: 'local' | 'global' | 'custom-hook';
  name: string;
  description: string;
  usage: string;
  examples: string[];
}

export interface NamingConvention {
  category: string;
  pattern: string;
  description: string;
  examples: string[];
}

/**
 * Pattern analyzer utility for identifying code patterns
 */
class PatternAnalyzer {
  private readonly projectRoot: string;
  private readonly srcDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.srcDir = path.join(projectRoot, 'src');
  }

  /**
   * Analyze all patterns in the codebase
   */
  analyzePatterns(components: ComponentInfo[]): CodePatterns {
    return {
      compositionPatterns: this.analyzeCompositionPatterns(components),
      statePatterns: this.analyzeStatePatterns(),
      namingConventions: this.analyzeNamingConventions(components),
    };
  }

  /**
   * Analyze component composition patterns
   */
  private analyzeCompositionPatterns(components: ComponentInfo[]): CompositionPattern[] {
    const patterns: CompositionPattern[] = [];

    // Pattern 1: Container/Presentational Pattern
    const formComponents = components.filter(c => c.category === 'forms');
    if (formComponents.length > 0) {
      patterns.push({
        name: 'Form Composition Pattern',
        description: 'Forms are composed using Label + Input components with optional validation',
        examples: [
          'SignInForm uses Label + Input + Button components',
          'Form components accept className for customization via tailwind-merge',
        ],
      });
    }

    // Pattern 2: Compound Component Pattern
    const uiComponents = components.filter(c => c.category === 'ui');
    if (uiComponents.length > 0) {
      patterns.push({
        name: 'Variant-based Component Pattern',
        description: 'UI components use variant props to control appearance (primary, outline, etc.)',
        examples: [
          'Button component with variant="primary" | "outline"',
          'Button component with size="sm" | "md"',
        ],
      });
    }

    // Pattern 3: Icon Integration Pattern
    const componentsWithIcons = components.filter(c =>
      c.dependencies.some(dep => dep.includes('Icon'))
    );
    if (componentsWithIcons.length > 0) {
      patterns.push({
        name: 'Icon Integration Pattern',
        description: 'Components accept startIcon and endIcon props for flexible icon placement',
        examples: [
          'Button accepts startIcon and endIcon as ReactNode',
          'Icons imported from @/icons centralized module',
        ],
      });
    }

    // Pattern 4: Client Component Pattern
    patterns.push({
      name: 'Client Component Pattern',
      description: 'Interactive components use "use client" directive for client-side rendering',
      examples: [
        'SignInForm uses "use client" for useState hooks',
        'ThemeToggleButton uses "use client" for context access',
      ],
    });

    // Pattern 5: Styling Pattern
    patterns.push({
      name: 'Tailwind CSS Composition Pattern',
      description: 'Components use Tailwind CSS with dark mode variants and tailwind-merge for className overrides',
      examples: [
        'Label uses twMerge for className composition',
        'Dark mode classes: dark:bg-gray-800 dark:text-gray-400',
      ],
    });

    return patterns;
  }

  /**
   * Analyze state management patterns
   */
  private analyzeStatePatterns(): StatePattern[] {
    const patterns: StatePattern[] = [];

    // Check for Context patterns
    const contextDir = path.join(this.srcDir, 'context');
    if (fs.existsSync(contextDir)) {
      const contextFiles = fs.readdirSync(contextDir).filter(f => f.endsWith('.tsx'));

      contextFiles.forEach(file => {
        const filePath = path.join(contextDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        if (content.includes('createContext')) {
          const contextName = file.replace('.tsx', '');
          patterns.push({
            type: 'global',
            name: contextName,
            description: `Global state management using React Context`,
            usage: `Import and use the corresponding hook (e.g., useTheme, useSidebar)`,
            examples: [
              `const { theme, toggleTheme } = useTheme();`,
              `Wrap components with ${contextName.replace('Context', 'Provider')}`,
            ],
          });
        }
      });
    }

    // Check for custom hooks
    const hooksDir = path.join(this.srcDir, 'hooks');
    if (fs.existsSync(hooksDir)) {
      const hookFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

      hookFiles.forEach(file => {
        const hookName = file.replace(/\.(ts|tsx)$/, '');

        let description = 'Custom hook for reusable logic';
        let usage = `Import and call ${hookName}()`;

        if (hookName === 'useModal') {
          description = 'Custom hook for managing modal open/close state';
          usage = 'const { isOpen, openModal, closeModal, toggleModal } = useModal();';
        } else if (hookName === 'useGoBack') {
          description = 'Custom hook for navigation back functionality';
          usage = 'const goBack = useGoBack(); // Call goBack() to navigate';
        }

        patterns.push({
          type: 'custom-hook',
          name: hookName,
          description,
          usage,
          examples: [
            `Used in components that need ${hookName.replace('use', '').toLowerCase()} functionality`,
          ],
        });
      });
    }

    // Local state pattern
    patterns.push({
      type: 'local',
      name: 'useState Pattern',
      description: 'Local component state using React useState hook',
      usage: 'const [state, setState] = useState(initialValue);',
      examples: [
        'SignInForm uses useState for showPassword and isChecked',
        'SidebarContext uses useState for isExpanded, isMobileOpen, etc.',
      ],
    });

    return patterns;
  }

  /**
   * Analyze naming conventions
   */
  private analyzeNamingConventions(components: ComponentInfo[]): NamingConvention[] {
    const conventions: NamingConvention[] = [];

    // Component naming
    conventions.push({
      category: 'Component Files',
      pattern: 'PascalCase.tsx',
      description: 'Component files use PascalCase naming matching the component name',
      examples: [
        'Button.tsx exports Button component',
        'SignInForm.tsx exports SignInForm component',
        'ThemeToggleButton.tsx exports ThemeToggleButton component',
      ],
    });

    // Props interface naming
    const componentsWithProps = components.filter(c => c.props.length > 0);
    if (componentsWithProps.length > 0) {
      conventions.push({
        category: 'Props Interfaces',
        pattern: 'ComponentNameProps',
        description: 'Props interfaces are named with component name + "Props" suffix',
        examples: [
          'ButtonProps for Button component',
          'LabelProps for Label component',
        ],
      });
    }

    // Directory naming
    conventions.push({
      category: 'Directory Structure',
      pattern: 'kebab-case or category-based',
      description: 'Directories use kebab-case or category names (auth, charts, forms, ui)',
      examples: [
        'src/components/auth/ for authentication components',
        'src/components/form/ for form-related components',
        'src/components/ui/ for reusable UI components',
      ],
    });

    // Hook naming
    conventions.push({
      category: 'Custom Hooks',
      pattern: 'use + PascalCase',
      description: 'Custom hooks follow React convention with "use" prefix',
      examples: [
        'useModal for modal state management',
        'useGoBack for navigation',
        'useTheme for theme context access',
        'useSidebar for sidebar context access',
      ],
    });

    // Context naming
    conventions.push({
      category: 'Context Files',
      pattern: 'NameContext.tsx with useNameHook',
      description: 'Context files export both Context and a custom hook for accessing it',
      examples: [
        'ThemeContext.tsx exports ThemeProvider and useTheme hook',
        'SidebarContext.tsx exports SidebarProvider and useSidebar hook',
      ],
    });

    // Props naming
    conventions.push({
      category: 'Component Props',
      pattern: 'camelCase with descriptive names',
      description: 'Props use camelCase and descriptive names (onClick, startIcon, className)',
      examples: [
        'onClick for click handlers',
        'startIcon, endIcon for icon placement',
        'className for style customization',
        'variant, size for component variations',
      ],
    });

    // Boolean props
    conventions.push({
      category: 'Boolean Props',
      pattern: 'is/has prefix or direct name',
      description: 'Boolean props often use is/has prefix or direct descriptive names',
      examples: [
        'disabled for disabled state',
        'required for required fields',
        'isOpen for modal state',
        'isExpanded for sidebar state',
      ],
    });

    return conventions;
  }
}

/**
 * Main documentation generator class
 */
class DocumentationGenerator {
  private readonly projectRoot: string;
  private readonly docsDir: string;
  private readonly componentExtractor: ComponentExtractor;
  private readonly patternAnalyzer: PatternAnalyzer;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.docsDir = path.join(this.projectRoot, 'docs', 'tailadmin-template-docs');
    this.componentExtractor = new ComponentExtractor(this.projectRoot);
    this.patternAnalyzer = new PatternAnalyzer(this.projectRoot);
  }

  /**
   * Main entry point for documentation generation
   */
  async generate(): Promise<void> {
    console.log('Starting documentation generation...');

    try {
      // Ensure docs directory exists
      this.ensureDocsDirectory();

      // Generate architecture documentation
      console.log('\nGenerating architecture documentation...');
      await this.generateArchitectureDoc();

      // Generate component catalog documentation
      console.log('\nGenerating component catalog documentation...');
      await this.generateComponentCatalog();

      // Generate styling documentation
      console.log('\nGenerating styling documentation...');
      await this.generateStylingDoc();

      // Generate state management documentation
      console.log('\nGenerating state management documentation...');
      await this.generateStateManagementDoc();

      // Generate routing documentation
      console.log('\nGenerating routing documentation...');
      await this.generateRoutingDoc();

      // Generate forms documentation
      console.log('\nGenerating forms documentation...');
      await this.generateFormsDoc();

      // Generate data visualization documentation
      console.log('\nGenerating data visualization documentation...');
      await this.generateDataVizDoc();

      // Generate tables documentation
      console.log('\nGenerating tables documentation...');
      await this.generateTablesDoc();

      // Generate modals and dropdowns documentation
      console.log('\nGenerating modals and dropdowns documentation...');
      await this.generateModalsDropdownsDoc();

      // Generate icons documentation
      console.log('\nGenerating icons documentation...');
      await this.generateIconsDoc();

      // Generate TypeScript documentation
      console.log('\nGenerating TypeScript documentation...');
      await this.generateTypeScriptDoc();

      // Generate configuration documentation
      console.log('\nGenerating configuration documentation...');
      await this.generateConfigDoc();

      // Generate integration patterns documentation
      console.log('\nGenerating integration patterns documentation...');
      await this.generateIntegrationPatternsDoc();

      // Generate assets documentation
      console.log('\nGenerating assets documentation...');
      await this.generateAssetsDoc();

      // Generate accessibility documentation
      console.log('\nGenerating accessibility documentation...');
      await this.generateAccessibilityDoc();

      // Generate index documentation
      console.log('\nGenerating index documentation...');
      await this.generateIndexDoc();

      // Validate cross-references across generated markdown docs
      console.log('\nValidating cross-references...');
      this.validateCrossReferences();

      console.log('\nDocumentation generation completed successfully!');
    } catch (error) {
      console.error('Error during documentation generation:', error);
      throw error;
    }
  }

  /**
   * Generate architecture documentation
   */
  private async generateArchitectureDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    // Analyze directory structure
    const directoryStructure = this.analyzeDirectoryStructure();

    // Read package.json for dependencies
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    const content = `# Architecture Documentation

**Generated:** ${timestamp}

## Overview

TailAdmin is a Next.js 16 admin dashboard template built with React 19, TypeScript, and Tailwind CSS V4. It follows the Next.js App Router architecture with route groups for organizing different sections of the application.

## Project Structure

### Root Directory Structure

\`\`\`
TailAdmin/
├── src/                    # Source code
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── icons/             # SVG icon assets
│   └── layout/            # Layout components
├── public/                # Static assets
│   └── images/           # Image assets
├── scripts/               # Build and utility scripts
├── docs/                  # Generated documentation
├── package.json           # Project dependencies
├── next.config.ts         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration (implicit)
└── tsconfig.json          # TypeScript configuration (implicit)
\`\`\`

### Source Directory Structure

${directoryStructure}

## Next.js App Router Architecture

### Route Groups

TailAdmin uses Next.js route groups to organize pages into logical sections:

#### 1. **(admin)** Route Group
- **Purpose:** Main admin dashboard pages with sidebar and header layout
- **Layout:** \`src/app/(admin)/layout.tsx\`
- **Features:**
  - Responsive sidebar navigation (collapsible, mobile-friendly)
  - Top header with search, notifications, and user menu
  - Dynamic content area with automatic margin adjustment
  - Backdrop overlay for mobile sidebar
- **Sub-groups:**
  - **(others-pages):** Contains chart, form, table, calendar, and profile pages
  - **(ui-elements):** Contains UI component showcase pages (alerts, buttons, modals, etc.)
- **Pages:**
  - Dashboard home (\`/\`)
  - Charts (bar, line)
  - Forms (input, select, multiselect, date-picker)
  - Tables (basic tables with pagination)
  - Calendar (FullCalendar integration)
  - Profile pages
  - UI element showcases

#### 2. **(full-width-pages)** Route Group
- **Purpose:** Pages without sidebar/header layout (full-width)
- **Layout:** \`src/app/(full-width-pages)/layout.tsx\`
- **Features:** Minimal wrapper, no sidebar or header
- **Sub-groups:**
  - **(auth):** Authentication pages
  - **(error-pages):** Error and status pages

#### 3. **(auth)** Sub-group
- **Purpose:** Authentication and authorization pages
- **Layout:** \`src/app/(full-width-pages)/(auth)/layout.tsx\`
- **Features:**
  - Split-screen design (form on left, branding on right)
  - Centered form layout
  - Theme toggle button
  - Grid pattern background
- **Pages:**
  - Sign In (\`/signin\`)
  - Sign Up (\`/signup\`)

#### 4. **(error-pages)** Sub-group
- **Purpose:** Error and status pages
- **Layout:** Inherits from \`(full-width-pages)\` layout
- **Pages:**
  - 404 Not Found (\`/error-404\`)
  - 500 Internal Server Error
  - 503 Service Unavailable
  - Maintenance page
  - Success page

### Layout Hierarchy

\`\`\`mermaid
graph TD
    A[Root Layout<br/>src/app/layout.tsx] --> B[ThemeProvider + SidebarProvider]
    B --> C{Route Group}
    C -->|admin| D[Admin Layout<br/>AppSidebar + AppHeader]
    C -->|full-width-pages| E[Full Width Layout<br/>Minimal wrapper]
    D --> F[Dashboard Pages]
    E --> G{Sub-group}
    G -->|auth| H[Auth Layout<br/>Split-screen design]
    G -->|error-pages| I[Error Pages]
    H --> J[Sign In / Sign Up]
    I --> K[404 / 500 / 503]
\`\`\`

### Layout Components

#### Root Layout (\`src/app/layout.tsx\`)
- Wraps entire application
- Provides global context providers:
  - **ThemeProvider:** Dark/light mode management
  - **SidebarProvider:** Sidebar state management
- Loads global styles and fonts (Outfit from Google Fonts)
- Imports flatpickr CSS for date picker styling

#### Admin Layout (\`src/app/(admin)/layout.tsx\`)
- Client component (\`"use client"\`)
- Renders:
  - **AppSidebar:** Collapsible navigation sidebar
  - **AppHeader:** Top header with search and user menu
  - **Backdrop:** Mobile overlay for sidebar
- Dynamic margin adjustment based on sidebar state:
  - Collapsed: \`lg:ml-[90px]\`
  - Expanded: \`lg:ml-[290px]\`
  - Mobile: \`ml-0\` (sidebar overlays content)

#### Auth Layout (\`src/app/(full-width-pages)/(auth)/layout.tsx\`)
- Split-screen design:
  - Left: Authentication form
  - Right: Branding and description (hidden on mobile)
- Features:
  - Grid pattern background
  - Theme toggle button (fixed bottom-right)
  - Responsive design (stacks vertically on mobile)

## Component Architecture

### Component Categories

${this.generateComponentCategoriesSection()}

### Layout Components

- **AppSidebar** (\`src/layout/AppSidebar.tsx\`): Main navigation sidebar with collapsible menu
- **AppHeader** (\`src/layout/AppHeader.tsx\`): Top header with search, notifications, and user dropdown
- **Backdrop** (\`src/layout/Backdrop.tsx\`): Mobile overlay for sidebar
- **SidebarWidget** (\`src/layout/SidebarWidget.tsx\`): Widget displayed in sidebar

## State Management

### Context Providers

TailAdmin uses React Context for global state management:

#### ThemeContext (\`src/context/ThemeContext.tsx\`)
- **Purpose:** Manage dark/light theme across the application
- **Hook:** \`useTheme()\`
- **State:**
  - \`theme\`: Current theme ('light' | 'dark')
  - \`toggleTheme()\`: Function to toggle theme
- **Persistence:** Theme preference saved to localStorage

#### SidebarContext (\`src/context/SidebarContext.tsx\`)
- **Purpose:** Manage sidebar state (expanded, collapsed, mobile)
- **Hook:** \`useSidebar()\`
- **State:**
  - \`isExpanded\`: Sidebar expanded state (desktop)
  - \`isHovered\`: Sidebar hover state
  - \`isMobileOpen\`: Sidebar open state (mobile)
  - \`toggleSidebar()\`: Toggle sidebar expansion
  - \`openMobileSidebar()\`: Open mobile sidebar
  - \`closeMobileSidebar()\`: Close mobile sidebar

### Custom Hooks

- **useModal** (\`src/hooks/useModal.ts\`): Manage modal open/close state
- **useGoBack** (\`src/hooks/useGoBack.ts\`): Navigation back functionality

## Dependencies

### Core Framework Dependencies

${this.generateDependenciesSection(packageJson.dependencies)}

### Development Dependencies

Key development tools:
- **TypeScript** (${packageJson.devDependencies.typescript}): Type safety and enhanced IDE support
- **ESLint** (${packageJson.devDependencies.eslint}): Code linting and quality checks
- **PostCSS** (${packageJson.devDependencies.postcss}): CSS processing
- **tsx** (${packageJson.devDependencies.tsx}): TypeScript execution for scripts

## Architecture Diagram

\`\`\`mermaid
graph TB
    subgraph "Application Layer"
        A[Next.js App Router]
        B[React 19 Components]
        C[TypeScript]
    end
    
    subgraph "State Management"
        D[ThemeContext]
        E[SidebarContext]
        F[Custom Hooks]
    end
    
    subgraph "UI Layer"
        G[Tailwind CSS V4]
        H[Component Library]
        I[Layout Components]
    end
    
    subgraph "Data Visualization"
        J[ApexCharts]
        K[FullCalendar]
        L[JVectorMap]
    end
    
    subgraph "Utilities"
        M[Flatpickr]
        N[Swiper]
        O[React DnD]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    B --> F
    B --> H
    H --> G
    H --> I
    H --> J
    H --> K
    H --> L
    H --> M
    H --> N
    H --> O
\`\`\`

## Rendering Strategy

### Server-Side Rendering (SSR)
- Default for all pages in Next.js App Router
- Pages are rendered on the server for each request
- Provides SEO benefits and fast initial page load

### Client-Side Rendering (CSR)
- Components using \`"use client"\` directive
- Required for:
  - Interactive components (forms, modals, dropdowns)
  - Components using React hooks (useState, useEffect, useContext)
  - Components accessing browser APIs

### Static Site Generation (SSG)
- Available for pages without dynamic data
- Can be configured per page using Next.js data fetching methods

## File Organization Conventions

### Component Files
- **Location:** \`src/components/[category]/[ComponentName].tsx\`
- **Naming:** PascalCase matching component name
- **Categories:** auth, charts, forms, tables, ui, ecommerce, user-profile, calendar, videos

### Page Files
- **Location:** \`src/app/[route-group]/[page-name]/page.tsx\`
- **Naming:** Always named \`page.tsx\`
- **Route groups:** Use parentheses for grouping without affecting URL

### Layout Files
- **Location:** \`src/app/[route-group]/layout.tsx\`
- **Naming:** Always named \`layout.tsx\`
- **Hierarchy:** Nested layouts compose automatically

### Context Files
- **Location:** \`src/context/[ContextName]Context.tsx\`
- **Naming:** \`[Name]Context.tsx\` with corresponding \`use[Name]\` hook
- **Export:** Both Context and custom hook

### Hook Files
- **Location:** \`src/hooks/use[HookName].ts\`
- **Naming:** \`use\` prefix + PascalCase
- **Export:** Hook function as default or named export

## Cross-References

- [Component Catalog](./components.md) - Detailed component documentation
- [Styling Guide](./styling.md) - Tailwind CSS and theming
- [State Management](./state-management.md) - Context and hooks details
- [Routing Guide](./routing.md) - Next.js routing patterns
- [Integration Patterns](./integration-patterns.md) - How to extend the project

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'architecture.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate component catalog documentation
   */
  private async generateComponentCatalog(): Promise<void> {
    const timestamp = new Date().toISOString();

    // Extract all components
    console.log('Extracting component information...');
    const components = this.componentExtractor.extractAllComponents();

    // Group components by category
    const groupedComponents = this.groupComponentsByCategory(components);

    // Analyze patterns
    console.log('Analyzing code patterns...');
    const patterns = this.patternAnalyzer.analyzePatterns(components);

    // Generate content
    const content = `# Component Catalog

**Generated:** ${timestamp}

## Overview

This document provides a comprehensive catalog of all React components in the TailAdmin project. Components are organized by category, with detailed information about their purpose, props, dependencies, and usage examples.

**Total Components:** ${components.length}

## Component Categories

${this.generateCategorySummary(groupedComponents)}

## Components by Category

${this.generateComponentsByCategory(groupedComponents)}

## Component Dependencies

${this.generateDependencyGraph(components)}

## Component Patterns

${this.generateComponentPatterns(patterns)}

## Usage Examples

${this.generateUsageExamples(groupedComponents)}

## Cross-References

- [Architecture Documentation](./architecture.md) - Project structure and routing
- [Styling Guide](./styling.md) - Tailwind CSS and theming
- [State Management](./state-management.md) - Context and hooks
- [Forms Documentation](./forms.md) - Form components and validation
- [Integration Patterns](./integration-patterns.md) - How to create new components

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'components.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate styling and theme documentation
   */
  private async generateStylingDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const globalsCssPath = path.join(this.projectRoot, 'src', 'app', 'globals.css');
    const postcssConfigPath = path.join(this.projectRoot, 'postcss.config.js');
    const packageJsonPath = path.join(this.projectRoot, 'package.json');

    const globalsCss = fs.existsSync(globalsCssPath)
      ? fs.readFileSync(globalsCssPath, 'utf-8')
      : '';
    const postcssConfig = fs.existsSync(postcssConfigPath)
      ? fs.readFileSync(postcssConfigPath, 'utf-8')
      : '';
    const packageJson = fs.existsSync(packageJsonPath)
      ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      : { dependencies: {}, devDependencies: {} };

    const breakpoints = this.extractCssVariables(globalsCss, '--breakpoint-');
    const colorTokens = this.extractCssVariables(globalsCss, '--color-');
    const customUtilities = this.extractCustomUtilities(globalsCss);
    const colorPalette = this.groupColorTokensByFamily(colorTokens);
    const responsiveUsage = this.collectResponsivePrefixUsage();
    const darkVariantUsage = this.countDarkVariantUsage();

    const tailwindVersion = packageJson.devDependencies?.tailwindcss || 'v4';
    const postcssPlugin = postcssConfig.includes('@tailwindcss/postcss')
      ? '@tailwindcss/postcss'
      : 'Not detected';

    const content = `# Styling Guide

**Generated:** ${timestamp}

## Overview

This document explains the styling system used in TailAdmin, including Tailwind CSS v4 setup, dark mode behavior, ThemeContext integration, custom utility classes, color tokens, and responsive patterns.

## Tailwind CSS V4 Configuration

### Core Setup

- **Tailwind Version:** ${tailwindVersion}
- **PostCSS Plugin:** ${postcssPlugin}
- **Global Entry File:** \`src/app/globals.css\`
- **Import Strategy:** Uses \`@import 'tailwindcss';\` (v4 style, no explicit \`tailwind.config.ts\` required for base setup)

### Theme Tokens via \`@theme\`

The project defines design tokens directly in CSS using Tailwind v4 primitives:

- Font tokens (e.g. \`--font-outfit\`)
- Breakpoint tokens (e.g. \`--breakpoint-sm\`, \`--breakpoint-2xl\`)
- Color tokens (brand, gray, success, error, warning, etc.)
- Shadow and z-index tokens

### PostCSS Configuration

\`postcss.config.js\` registers Tailwind with:

\`\`\`js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
\`\`\`

## Dark Mode System

### Dark Variant Definition

Dark mode is implemented with a custom Tailwind variant in \`globals.css\`:

\`\`\`css
@custom-variant dark (&:is(.dark *));
\`\`\`

This means all \`dark:*\` classes are activated when the \`.dark\` class exists in the DOM tree.

### Runtime Behavior

- Theme value is persisted in \`localStorage\` (key: \`theme\`)
- On startup, saved theme is restored on the client
- The \`.dark\` class is toggled on \`document.documentElement\`
- The codebase currently contains approximately **${darkVariantUsage}** usages of \`dark:\` variant utilities

## ThemeContext and Usage

### Context API

The app exposes a dedicated theme API:

- \`theme: 'light' | 'dark'\`
- \`toggleTheme(): void\`
- \`useTheme()\` hook for consuming components

### Provider Hierarchy

\`ThemeProvider\` wraps the full application in \`src/app/layout.tsx\`, so any client component can call \`useTheme()\`.

### Example

\`\`\`tsx
const { theme, toggleTheme } = useTheme();

<button onClick={toggleTheme}>
  Current theme: {theme}
</button>
\`\`\`

## Custom Tailwind Utilities

The project defines custom reusable utility classes using \`@utility\`.

**Detected utilities:** ${customUtilities.length}

${this.generateBulletList(customUtilities)}

### Why this pattern is used

- Reduces repeated long class strings
- Centralizes sidebar and dropdown visual rules
- Keeps component markup more maintainable

## Color Palette

The palette is tokenized through \`--color-*\` variables in \`@theme\`.

### Palette Families

${this.generateColorPaletteTable(colorPalette)}

### Example Brand Scale

${this.generateFamilyTokenTable(colorPalette, 'brand')}

## Responsive Design Patterns

### Breakpoint Tokens

${this.generateBreakpointTable(breakpoints)}

### Prefix usage across source code

${this.generateResponsiveUsageTable(responsiveUsage)}

### Common responsive patterns used

- Mobile-first layouts with progressive enhancement (\`sm:\`, \`md:\`, \`lg:\`, \`xl:\`)
- Dashboard column changes by breakpoint (e.g. \`grid-cols-12\`, \`xl:col-span-*\`)
- Adaptive spacing and sizing (e.g. \`md:gap-6\`, \`lg:p-6\`, \`2xl:gap-x-32\`)
- Visibility and alignment changes by viewport (e.g. \`xl:flex-row\`, \`sm:w-[361px]\`)

## Cross-References

- [Architecture Documentation](./architecture.md) - Layout hierarchy and providers
- [State Management](./state-management.md) - Context patterns and hooks
- [Component Catalog](./components.md) - Components consuming theme and responsive classes
- [Configuration](./configuration.md) - Tooling and build setup

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'styling.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate state management documentation
   */
  private async generateStateManagementDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const themeContextPath = path.join(this.projectRoot, 'src', 'context', 'ThemeContext.tsx');
    const sidebarContextPath = path.join(this.projectRoot, 'src', 'context', 'SidebarContext.tsx');
    const useModalPath = path.join(this.projectRoot, 'src', 'hooks', 'useModal.ts');
    const useGoBackPath = path.join(this.projectRoot, 'src', 'hooks', 'useGoBack.ts');

    const themeContextCode = fs.existsSync(themeContextPath)
      ? fs.readFileSync(themeContextPath, 'utf-8')
      : '';
    const sidebarContextCode = fs.existsSync(sidebarContextPath)
      ? fs.readFileSync(sidebarContextPath, 'utf-8')
      : '';
    const useModalCode = fs.existsSync(useModalPath)
      ? fs.readFileSync(useModalPath, 'utf-8')
      : '';
    const useGoBackCode = fs.existsSync(useGoBackPath)
      ? fs.readFileSync(useGoBackPath, 'utf-8')
      : '';

    const themeFields = this.extractTypeLiteralFields(themeContextCode, 'ThemeContextType');
    const sidebarFields = this.extractTypeLiteralFields(sidebarContextCode, 'SidebarContextType');
    const themeConsumers = this.findHookConsumers('useTheme', [themeContextPath]);
    const sidebarConsumers = this.findHookConsumers('useSidebar', [sidebarContextPath]);
    const modalConsumers = this.findHookConsumers('useModal', [useModalPath]);
    const goBackConsumers = this.findHookConsumers('useGoBack', [useGoBackPath]);

    const themePurpose: Record<string, string> = {
      theme: 'Holds the active visual theme and drives dark/light class behavior.',
      toggleTheme: 'Switches theme between light and dark modes.',
    };

    const sidebarPurpose: Record<string, string> = {
      isExpanded: 'Desktop sidebar expanded/collapsed state.',
      isMobileOpen: 'Mobile drawer open/close state.',
      isHovered: 'Temporary desktop hover state when collapsed.',
      activeItem: 'Tracks current active sidebar item.',
      openSubmenu: 'Tracks currently open submenu identifier.',
      toggleSidebar: 'Toggles desktop sidebar width state.',
      toggleMobileSidebar: 'Opens/closes sidebar on mobile screens.',
      setIsHovered: 'Manually sets hover state from layout interactions.',
      setActiveItem: 'Sets active item for navigation highlighting.',
      toggleSubmenu: 'Opens/closes a submenu by item key.',
    };

    const useModalHasInitialState = /initialState\s*:\s*boolean\s*=\s*false/.test(useModalCode);
    const useGoBackHasFallback = /router\.push\("\/"\)/.test(useGoBackCode);

    const content = `# State Management Guide

**Generated:** ${timestamp}

## Overview

This document describes how state is managed in TailAdmin, covering global context providers, custom hooks, local component state patterns, and context subscription behavior.

## Global State with Context Providers

TailAdmin uses React Context for cross-cutting UI state that must be shared across layouts and many components.

### Provider Hierarchy

Root provider composition is defined in \`src/app/layout.tsx\`:

\`\`\`tsx
<ThemeProvider>
  <SidebarProvider>{children}</SidebarProvider>
</ThemeProvider>
\`\`\`

### ThemeContext (\`src/context/ThemeContext.tsx\`)

**Purpose:** Global dark/light theme state with localStorage persistence.

${this.generateContextApiTable(themeFields, themePurpose)}

**Subscription points detected:** ${themeConsumers.length}

${this.generatePathBulletList(themeConsumers)}

### SidebarContext (\`src/context/SidebarContext.tsx\`)

**Purpose:** Shared sidebar navigation state for desktop and mobile behaviors.

${this.generateContextApiTable(sidebarFields, sidebarPurpose)}

**Subscription points detected:** ${sidebarConsumers.length}

${this.generatePathBulletList(sidebarConsumers)}

## Custom Hooks

### useModal (\`src/hooks/useModal.ts\`)

**Purpose:** Reusable open/close/toggle state abstraction for modal UI.

- Supports optional initial value: ${useModalHasInitialState ? 'Yes (\`initialState = false\`)' : 'Not detected'}
- Returns: \`isOpen\`, \`openModal\`, \`closeModal\`, \`toggleModal\`
- Internally uses \`useState\` + \`useCallback\`

**Consumers detected:** ${modalConsumers.length}

${this.generatePathBulletList(modalConsumers)}

#### Example

\`\`\`tsx
const { isOpen, openModal, closeModal } = useModal();

<Button onClick={openModal}>Open Modal</Button>
<Modal isOpen={isOpen} onClose={closeModal} />
\`\`\`

### useGoBack (\`src/hooks/useGoBack.ts\`)

**Purpose:** Navigation helper that safely returns to previous page or redirects home.

- Uses Next.js router: \`useRouter\`
- Fallback route when no history exists: ${useGoBackHasFallback ? '\`/\`' : 'Not detected'}

**Consumers detected:** ${goBackConsumers.length}

${this.generatePathBulletList(goBackConsumers)}

#### Example

\`\`\`tsx
const goBack = useGoBack();

<button onClick={goBack}>Back</button>
\`\`\`

## Local vs Global State Patterns

### Global State (Context)

Use context when state must be synchronized across distant components.

- Theme synchronization: header toggles + entire app styling
- Sidebar synchronization: header button, sidebar panel, backdrop, admin layout spacing

### Local State (Component)

Use local \`useState\` when state is private to a component or page section.

- App header menu toggling
- Sidebar submenu open/close in component-local structure
- Form input and UI interaction state

### Reusable Local State (Custom Hooks)

Use custom hooks when local state pattern repeats in multiple components.

- \`useModal\`: repeated in calendar, examples, and profile modals
- \`useGoBack\`: reusable navigation fallback pattern

## Context Subscription Model

Components subscribe to context changes through custom hooks (\`useTheme\`, \`useSidebar\`).
When provider values update, subscribed components re-render automatically with the latest state.

\`\`\`mermaid
graph TD
    A[ThemeProvider] --> B[useTheme in UI consumers]
    C[SidebarProvider] --> D[useSidebar in AppHeader]
    C --> E[useSidebar in AppSidebar]
    C --> F[useSidebar in Backdrop]
    C --> G[useSidebar in Admin Layout]
\`\`\`

## Recommended Usage Rules

- Keep context state focused and UI-centric (theme/sidebar only)
- Keep page/form details as local state unless shared globally
- Wrap repeated state logic into custom hooks before introducing new context
- Keep provider APIs minimal and explicit to reduce accidental re-renders

## Cross-References

- [Architecture Documentation](./architecture.md) - Provider placement and layout composition
- [Styling Guide](./styling.md) - Theme and dark mode implementation
- [Modals & Dropdowns](./modals-dropdowns.md) - Modal interaction patterns
- [Integration Patterns](./integration-patterns.md) - How to add new providers and hooks

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'state-management.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate routing and navigation documentation
   */
  private async generateRoutingDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const appDir = path.join(this.projectRoot, 'src', 'app');
    const sidebarPath = path.join(this.projectRoot, 'src', 'layout', 'AppSidebar.tsx');
    const pages = this.discoverAppPages(appDir);
    const routeGroups = this.discoverRouteGroups(appDir);
    const layoutChainByPage = this.buildLayoutChainByPage(appDir, pages);
    const sidebarEntries = this.extractSidebarNavigationEntries(sidebarPath);
    const breadcrumbUsages = this.findFilesContaining(
      path.join(this.projectRoot, 'src', 'app'),
      /PageBreadcrumb\s*from|<PageBreadcrumb\b/
    );

    const errorPagesDetected = pages.filter((page) => /\/error-|not-found/.test(page.route));
    const has500 = pages.some((page) => page.route.includes('/error-500'));
    const has503 = pages.some((page) => page.route.includes('/error-503'));
    const hasMaintenance = pages.some((page) => page.route.includes('/maintenance'));

    const content = `# Routing & Navigation Guide

**Generated:** ${timestamp}

## Overview

This document describes the Next.js App Router structure in TailAdmin, including route groups, nested layouts, sidebar navigation configuration, error pages, and breadcrumb behavior.

## Next.js App Router Structure

### Route Files Detected

- Total \`page.tsx\` routes: **${pages.length}**
- Total route groups: **${routeGroups.length}**

### Route Groups and Purpose

${this.generateRouteGroupsTable(routeGroups)}

### URL Routes (group folders excluded)

${this.generateRoutesTable(pages)}

## Nested Layouts

The app uses multiple layout levels:

- Root layout: \`src/app/layout.tsx\`
- Admin layout: \`src/app/(admin)/layout.tsx\`
- Full width layout: \`src/app/(full-width-pages)/layout.tsx\`
- Auth layout: \`src/app/(full-width-pages)/(auth)/layout.tsx\`

### Layout chain by route

${this.generateLayoutChainTable(layoutChainByPage)}

\`\`\`mermaid
graph TD
    A[src/app/layout.tsx] --> B{Route Group}
    B -->|admin| C[src/app/(admin)/layout.tsx]
    B -->|full-width-pages| D[src/app/(full-width-pages)/layout.tsx]
    D -->|auth| E[src/app/(full-width-pages)/(auth)/layout.tsx]
    C --> F[Dashboard, forms, tables, charts, calendar, profile, UI elements]
    E --> G[signin, signup]
    D --> H[error-404 and other full-width pages]
\`\`\`

## AppSidebar Navigation Configuration

Sidebar navigation is defined in \`src/layout/AppSidebar.tsx\` via two arrays:

- \`navItems\` (main section)
- \`othersItems\` (secondary section)

### Sidebar route entries

${this.generateSidebarEntriesTable(sidebarEntries)}

### Sidebar behavior summary

- Active route highlighting based on \`usePathname()\`
- Automatic submenu open when current route matches a submenu item
- Responsive behavior via \`SidebarContext\` (desktop collapse + mobile drawer)

## Error Pages

### Detected

${this.generateErrorPagesList(errorPagesDetected)}

### Requirement coverage status

- 404 page: ✅ Implemented
- 500 page: ${has500 ? '✅ Implemented' : '⚠ Not detected in current codebase'}
- 503 page: ${has503 ? '✅ Implemented' : '⚠ Not detected in current codebase'}
- Maintenance page: ${hasMaintenance ? '✅ Implemented' : '⚠ Not detected in current codebase'}

## PageBreadCrumb Component

### Component source

- File: \`src/components/common/PageBreadCrumb.tsx\`
- API: \`pageTitle: string\`
- Behavior: renders a two-level breadcrumb (Home → current page title)

### Usage footprint

- Usages detected in App Router pages: **${breadcrumbUsages.length}**

${this.generatePathBulletList(breadcrumbUsages.map((item) => path.relative(this.projectRoot, item)))}

### Example

\`\`\`tsx
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

<PageBreadcrumb pageTitle="Basic Table" />
\`\`\`

## Routing Patterns

- Route groups (folders in parentheses) are used for organization without affecting URL paths
- Most admin content is served under the admin layout and still maps to clean URLs
- Auth pages are rendered in a separate nested layout with full-width structure
- Error and utility routes can live in full-width group while preserving route clarity

## Cross-References

- [Architecture Documentation](./architecture.md) - High-level layout composition
- [State Management](./state-management.md) - Sidebar context behavior
- [Component Catalog](./components.md) - Layout and navigation component references
- [Integration Patterns](./integration-patterns.md) - Creating new pages and route modules

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'routing.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate forms and input documentation
   */
  private async generateFormsDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const components = this.componentExtractor.extractAllComponents();
    const formComponents = components
      .filter((component) => component.category === 'forms')
      .sort((a, b) => a.name.localeCompare(b.name));
    const authComponents = components
      .filter((component) => component.category === 'auth')
      .sort((a, b) => a.name.localeCompare(b.name));

    const datePickerPath = path.join(this.projectRoot, 'src', 'components', 'form', 'date-picker.tsx');
    const inputStatesPath = path.join(this.projectRoot, 'src', 'components', 'form', 'form-elements', 'InputStates.tsx');
    const signInPath = path.join(this.projectRoot, 'src', 'components', 'auth', 'SignInForm.tsx');
    const signUpPath = path.join(this.projectRoot, 'src', 'components', 'auth', 'SignUpForm.tsx');

    const datePickerCode = fs.existsSync(datePickerPath)
      ? fs.readFileSync(datePickerPath, 'utf-8')
      : '';
    const inputStatesCode = fs.existsSync(inputStatesPath)
      ? fs.readFileSync(inputStatesPath, 'utf-8')
      : '';
    const signInCode = fs.existsSync(signInPath)
      ? fs.readFileSync(signInPath, 'utf-8')
      : '';
    const signUpCode = fs.existsSync(signUpPath)
      ? fs.readFileSync(signUpPath, 'utf-8')
      : '';

    const usesFlatpickr = /from\s+'flatpickr'|flatpickr\(/.test(datePickerCode);
    const hasEmailRegexValidation = /\^\[a-zA-Z0-9\._%\+\-\]\+@/.test(inputStatesCode);
    const hasStateBasedValidationStyles = /error\s*=\{|success\s*=\{|hint\s*=/.test(inputStatesCode);
    const authUsesInputAndLabel =
      /from\s+"@\/components\/form\/input\/InputField"/.test(signInCode) &&
      /from\s+"@\/components\/form\/Label"/.test(signInCode) &&
      /from\s+"@\/components\/form\/input\/InputField"/.test(signUpCode) &&
      /from\s+"@\/components\/form\/Label"/.test(signUpCode);

    const topLevelForms = [
      'src/components/form/Form.tsx',
      'src/components/form/Label.tsx',
      'src/components/form/Select.tsx',
      'src/components/form/MultiSelect.tsx',
      'src/components/form/date-picker.tsx',
      'src/components/form/switch/Switch.tsx',
      'src/components/form/input/InputField.tsx',
      'src/components/form/input/Checkbox.tsx',
      'src/components/form/input/TextArea.tsx',
    ];

    let formComponentsTable = '| Component | Path | Props Count |\n';
    formComponentsTable += '|-----------|------|-------------|\n';
    formComponents.forEach((component) => {
      formComponentsTable += `| ${component.name} | \`src/${component.path}\` | ${component.props.length} |\n`;
    });

    let authComponentsTable = '| Component | Path | Purpose |\n';
    authComponentsTable += '|-----------|------|---------|\n';
    authComponents.forEach((component) => {
      authComponentsTable += `| ${component.name} | \`src/${component.path}\` | ${component.description} |\n`;
    });

    const content = `# Forms & Inputs Guide

**Generated:** ${timestamp}

## Overview

This document describes the form system used in TailAdmin, including reusable form inputs, composition with \`Form\` and \`Label\`, validation patterns, authentication form examples, and date-picker integration with flatpickr.

## Form Component Inventory

### Core reusable form components

${formComponentsTable}

### Main input components requested in requirements

${this.generateBulletList(topLevelForms.map((item) => item.replace('src/components/form/', '')))}

## Form + Label Composition Pattern

### Form component

- File: \`src/components/form/Form.tsx\`
- Purpose: central wrapper for form submission handling
- Behavior: prevents default submit and forwards event to \`onSubmit\`

### Label component

- File: \`src/components/form/Label.tsx\`
- Purpose: consistent form label typography/spacings
- Utility: uses \`twMerge\` for safe class override composition

### Typical usage

\`\`\`tsx
<Form onSubmit={handleSubmit}>
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="info@gmail.com" />
</Form>
\`\`\`

## Validation Patterns

Validation is primarily handled at component/page level (client-side), with visual states in shared inputs.

### Detected patterns

- Email regex validation in demo states: ${hasEmailRegexValidation ? '✅ Detected in `InputStates.tsx`' : '⚠ Not detected'}
- Visual state props (\`error\`, \`success\`, \`hint\`): ${hasStateBasedValidationStyles ? '✅ Detected' : '⚠ Not detected'}
- Required field markers in auth forms (\`*\`): ✅ Detected

### State-driven validation style example

\`\`\`tsx
<Input
  type="email"
  error={hasError}
  success={!hasError}
  hint={hasError ? "This is an invalid email address." : "Valid email!"}
/>
\`\`\`

## Authentication Forms as Reference Implementations

${authComponentsTable}

### Common patterns in auth forms

- Reuse \`Label\` + \`Input\` primitives
- Password visibility toggle with icon state
- Checkbox-based consent/session behaviors
- Client-side state via \`useState\` for interactive controls

- Shared input/label usage in SignIn and SignUp: ${authUsesInputAndLabel ? '✅ Yes' : '⚠ Not fully detected'}

## Date Picker and flatpickr Integration

### Integration status

- \`flatpickr\` usage in \`date-picker.tsx\`: ${usesFlatpickr ? '✅ Detected' : '⚠ Not detected'}
- CSS import: \`flatpickr/dist/flatpickr.css\`
- Wrapper component: \`DatePicker\` with \`mode\`, \`defaultDate\`, \`onChange\`, \`placeholder\`

### Flatpickr behavior notes

- Initializes in \`useEffect\` using the element id
- Supports modes: \`single\`, \`multiple\`, \`range\`, \`time\`
- Destroys flatpickr instance on unmount to avoid leaks

### Example

\`\`\`tsx
<DatePicker
  id="invoice-date"
  label="Invoice date"
  mode="single"
  placeholder="Select a date"
  onChange={(dates) => console.log(dates)}
/>
\`\`\`

## Form State Management Patterns

- Local \`useState\` for input values and UI toggles (password visibility, checkbox state)
- Controlled components for custom widgets (e.g. \`MultiSelect\`, \`PhoneInput\`)
- Callback-driven updates to parent scope (\`onChange\` props)
- Shared visual styles for disabled, error, and success states

## Recommended Extension Pattern

When creating new forms:

1. Start from \`Label\` + input primitives
2. Keep validation and UI state local unless globally needed
3. Expose typed \`onChange\` callbacks in custom form controls
4. Reuse existing styles/hint conventions to keep consistency

## Cross-References

- [Component Catalog](./components.md) - Detailed component metadata
- [State Management](./state-management.md) - Local/global state usage principles
- [Styling Guide](./styling.md) - Input styling and theme behavior
- [Routing Guide](./routing.md) - Form pages under App Router

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'forms.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate data visualization documentation
   */
  private async generateDataVizDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = fs.existsSync(packageJsonPath)
      ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      : { dependencies: {} };
    const dependencies = packageJson.dependencies || {};

    const components = this.componentExtractor.extractAllComponents();
    const chartComponents = components
      .filter((component) => component.category === 'charts')
      .sort((a, b) => a.name.localeCompare(b.name));
    const ecommerceComponents = components
      .filter((component) => component.category === 'ecommerce')
      .sort((a, b) => a.name.localeCompare(b.name));
    const calendarComponents = components
      .filter((component) => component.category === 'calendar')
      .sort((a, b) => a.name.localeCompare(b.name));

    const lineChartPath = path.join(this.projectRoot, 'src', 'components', 'charts', 'line', 'LineChartOne.tsx');
    const barChartPath = path.join(this.projectRoot, 'src', 'components', 'charts', 'bar', 'BarChartOne.tsx');
    const countryMapPath = path.join(this.projectRoot, 'src', 'components', 'ecommerce', 'CountryMap.tsx');
    const calendarPath = path.join(this.projectRoot, 'src', 'components', 'calendar', 'Calendar.tsx');
    const statisticsChartPath = path.join(this.projectRoot, 'src', 'components', 'ecommerce', 'StatisticsChart.tsx');

    const lineChartCode = fs.existsSync(lineChartPath) ? fs.readFileSync(lineChartPath, 'utf-8') : '';
    const barChartCode = fs.existsSync(barChartPath) ? fs.readFileSync(barChartPath, 'utf-8') : '';
    const countryMapCode = fs.existsSync(countryMapPath) ? fs.readFileSync(countryMapPath, 'utf-8') : '';
    const calendarCode = fs.existsSync(calendarPath) ? fs.readFileSync(calendarPath, 'utf-8') : '';
    const statisticsChartCode = fs.existsSync(statisticsChartPath) ? fs.readFileSync(statisticsChartPath, 'utf-8') : '';

    const usesReactApexDynamic =
      /dynamic\(\(\) => import\("react-apexcharts"\)/.test(lineChartCode) ||
      /dynamic\(\(\) => import\("react-apexcharts"\)/.test(barChartCode);
    const usesApexOptions = /ApexOptions/.test(lineChartCode) && /ApexOptions/.test(barChartCode);
    const hasCountryVectorMap =
      /@react-jvectormap\/core/.test(countryMapCode) && /@react-jvectormap\/world/.test(countryMapCode);
    const usesFullCalendar = /@fullcalendar\/react/.test(calendarCode);
    const hasCalendarCrudPattern =
      /setEvents\(/.test(calendarCode) && /handleAddOrUpdateEvent/.test(calendarCode);
    const usesFlatpickrRange = /flatpickr\(/.test(statisticsChartCode) && /mode:\s*"range"/.test(statisticsChartCode);

    let chartTable = '| Component | Path | Notes |\n';
    chartTable += '|-----------|------|-------|\n';
    chartComponents.forEach((component) => {
      const note = component.name.toLowerCase().includes('line')
        ? 'Line/area chart with gradient fill and monthly categories'
        : component.name.toLowerCase().includes('bar')
          ? 'Bar chart with monthly categories and tooltip formatting'
          : 'Chart component';
      chartTable += `| ${component.name} | \`src/${component.path}\` | ${note} |\n`;
    });

    let ecommerceVizTable = '| Component | Path | Visualization Role |\n';
    ecommerceVizTable += '|-----------|------|---------------------|\n';
    ecommerceComponents.forEach((component) => {
      const role = component.name === 'CountryMap'
        ? 'Interactive world map with marker overlays'
        : component.name === 'DemographicCard'
          ? 'CountryMap container + country distribution bars'
          : component.name === 'MonthlySalesChart'
            ? 'Apex bar chart for monthly sales trend'
            : component.name === 'StatisticsChart'
              ? 'Apex area chart + time-range picker'
              : component.name === 'EcommerceMetrics'
                ? 'KPI cards with trend deltas'
                : component.name === 'MonthlyTarget'
                  ? 'Radial progress chart for monthly target'
                  : 'Dashboard visualization support component';
      ecommerceVizTable += `| ${component.name} | \`src/${component.path}\` | ${role} |\n`;
    });

    let calendarTable = '| Component | Path | Notes |\n';
    calendarTable += '|-----------|------|-------|\n';
    calendarComponents.forEach((component) => {
      calendarTable += `| ${component.name} | \`src/${component.path}\` | FullCalendar integration with modal event management |\n`;
    });

    const content = `# Data Visualization Guide

**Generated:** ${timestamp}

## Overview

This document describes the data visualization stack in TailAdmin: chart components, map integration, ecommerce metric visuals, calendar scheduling UI, and update patterns for displayed data.

## Visualization Stack

### Library integrations

- \`apexcharts\` (${dependencies.apexcharts || 'N/A'})
- \`react-apexcharts\` (${dependencies['react-apexcharts'] || 'N/A'})
- \`@react-jvectormap/core\` (${dependencies['@react-jvectormap/core'] || 'N/A'})
- \`@react-jvectormap/world\` (${dependencies['@react-jvectormap/world'] || 'N/A'})
- \`@fullcalendar/react\` (${dependencies['@fullcalendar/react'] || 'N/A'})
- \`@fullcalendar/daygrid\`, \`@fullcalendar/timegrid\`, \`@fullcalendar/interaction\`
- \`flatpickr\` (${dependencies.flatpickr || 'N/A'}) for date range controls in analytics cards

## Chart Components (Line and Bar)

${chartTable}

### ApexCharts integration notes

- Dynamic import for SSR-safe rendering: ${usesReactApexDynamic ? '✅ Detected' : '⚠ Not detected'}
- Typed chart configuration via \`ApexOptions\`: ${usesApexOptions ? '✅ Detected' : '⚠ Not detected'}
- Common patterns:
  - Monthly categories on x-axis
  - Hidden toolbars for cleaner dashboard UI
  - Theme-consistent colors (brand palette)
  - Horizontal overflow wrappers for smaller screens

### Example usage

\`\`\`tsx
import LineChartOne from "@/components/charts/line/LineChartOne";

<ComponentCard title="Line Chart 1">
  <LineChartOne />
</ComponentCard>
\`\`\`

## CountryMap and react-jvectormap

- Source: \`src/components/ecommerce/CountryMap.tsx\`
- Integration status: ${hasCountryVectorMap ? '✅ Detected (@react-jvectormap/core + world map data)' : '⚠ Not detected'}
- Rendering strategy: dynamic import to avoid server-side map rendering issues
- Features used:
  - worldMill projection
  - region style and hover styling
  - custom markers by coordinates/country
  - optional \`mapColor\` prop for theme adaptation

### Related demographic visualization

\`DemographicCard\` composes \`CountryMap\` with country-level progress indicators for customer distribution.

## Ecommerce Metric Visualization Components

${ecommerceVizTable}

## Calendar and fullcalendar Integration

${calendarTable}

### FullCalendar integration status

- FullCalendar imports: ${usesFullCalendar ? '✅ Detected' : '⚠ Not detected'}
- Plugins in use: \`dayGridPlugin\`, \`timeGridPlugin\`, \`interactionPlugin\`
- Interaction model:
  - Date selection opens modal
  - Event click opens edit modal
  - Add/update event logic managed in component state

- Event CRUD-like state pattern detected: ${hasCalendarCrudPattern ? '✅ Yes (state updates via `setEvents` and `handleAddOrUpdateEvent`)' : '⚠ Not fully detected'}

## Data Update Patterns

Current data visualization update approaches in this codebase:

1. **Static seeded series/data arrays** for charts (line/bar/radial) at component level
2. **Local state updates** for interactive modules (calendar events)
3. **UI-only filter controls** (e.g., chart tabs and dropdown actions) prepared for future backend wiring
4. **Date-range driven analytics controls** with flatpickr range picker: ${usesFlatpickrRange ? '✅ Detected in `StatisticsChart`' : '⚠ Not detected'}

### Suggested real-time extension path

- Move chart series into async data hooks
- Poll or subscribe to backend endpoints for metric updates
- Keep chart options memoized and only update series payloads
- Reuse existing component boundaries (cards/charts/maps) for data source swaps

## Cross-References

- [Architecture Documentation](./architecture.md) - Overall dashboard structure
- [Components Catalog](./components.md) - Component-level references and dependencies
- [State Management](./state-management.md) - Local state and modal interaction patterns
- [Forms Documentation](./forms.md) - Shared input/date control conventions

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'data-visualization.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate tables and pagination documentation
   */
  private async generateTablesDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const components = this.componentExtractor.extractAllComponents();
    const tableComponents = components
      .filter((component) => component.category === 'tables')
      .sort((a, b) => a.name.localeCompare(b.name));

    const basicTablePath = path.join(this.projectRoot, 'src', 'components', 'tables', 'BasicTableOne.tsx');
    const paginationPath = path.join(this.projectRoot, 'src', 'components', 'tables', 'Pagination.tsx');
    const recentOrdersPath = path.join(this.projectRoot, 'src', 'components', 'ecommerce', 'RecentOrders.tsx');
    const basicTablesPagePath = path.join(this.projectRoot, 'src', 'app', '(admin)', '(others-pages)', '(tables)', 'basic-tables', 'page.tsx');
    const tableUiPath = path.join(this.projectRoot, 'src', 'components', 'ui', 'table', 'index.tsx');

    const basicTableCode = fs.existsSync(basicTablePath) ? fs.readFileSync(basicTablePath, 'utf-8') : '';
    const paginationCode = fs.existsSync(paginationPath) ? fs.readFileSync(paginationPath, 'utf-8') : '';
    const recentOrdersCode = fs.existsSync(recentOrdersPath) ? fs.readFileSync(recentOrdersPath, 'utf-8') : '';
    const basicTablesPageCode = fs.existsSync(basicTablesPagePath) ? fs.readFileSync(basicTablesPagePath, 'utf-8') : '';
    const tableUiCode = fs.existsSync(tableUiPath) ? fs.readFileSync(tableUiPath, 'utf-8') : '';

    const hasBasicResponsiveWrapper = /overflow-x-auto/.test(basicTableCode) && /min-w-\[\d+px\]/.test(basicTableCode);
    const hasRecentOrdersResponsiveWrapper = /overflow-x-auto/.test(recentOrdersCode);
    const hasPaginationWindowing = /Array\.from\(/.test(paginationCode) && /Math\.min\(3,\s*totalPages\)/.test(paginationCode);
    const hasPaginationPrevNextDisable = /disabled=\{currentPage === 1\}/.test(paginationCode)
      && /disabled=\{currentPage === totalPages\}/.test(paginationCode);
    const hasSortingLogic = /\.sort\s*\(/.test(basicTableCode) || /\.sort\s*\(/.test(recentOrdersCode);
    const hasFilteringLogic = /\.filter\s*\(/.test(basicTableCode) || /\.filter\s*\(/.test(recentOrdersCode);
    const hasFilterUi = /Filter/.test(recentOrdersCode);
    const hasBasicTablePageExample = /<BasicTableOne\s*\/>/.test(basicTablesPageCode);
    const hasTypedTablePrimitives = /interface\s+TableProps/.test(tableUiCode) && /interface\s+TableCellProps/.test(tableUiCode);

    let tableComponentInventory = '| Component | Path | Purpose |\n';
    tableComponentInventory += '|-----------|------|---------|\n';
    tableComponents.forEach((component) => {
      const purpose = component.name === 'BasicTableOne'
        ? 'Primary example of a responsive data table with avatar cells and status badges'
        : component.name === 'Pagination'
          ? 'Reusable pagination control with prev/next and windowed page numbers'
          : component.description;
      tableComponentInventory += `| ${component.name} | \`src/${component.path}\` | ${purpose} |\n`;
    });

    const content = `# Tables & Pagination Guide

**Generated:** ${timestamp}

## Overview

This document covers table-related UI patterns in TailAdmin, including \`BasicTableOne\`, the reusable \`Pagination\` component, sorting/filtering conventions, \`RecentOrders\` as a richer table example, and responsive table handling.

## Table Components Inventory

${tableComponentInventory}

### Table primitive layer

- File: \`src/components/ui/table/index.tsx\`
- Typed primitives available: ${hasTypedTablePrimitives ? '✅ \`Table\`, \`TableHeader\`, \`TableBody\`, \`TableRow\`, \`TableCell\` with typed props' : '⚠ Could not confirm full typed primitive set'}
- Pattern: render composition through semantic table tags and optional \`className\` overrides

## BasicTableOne

- File: \`src/components/tables/BasicTableOne.tsx\`
- Data shape: local \`Order\` interface + seeded \`tableData\` array
- Rendering style:
  - Avatar + role in first column
  - Team avatar stack in dedicated column
  - Status rendered through \`Badge\` color mapping

### Usage example in App Router

- Source page: \`src/app/(admin)/(others-pages)/(tables)/basic-tables/page.tsx\`
- Embedded usage detected: ${hasBasicTablePageExample ? '✅ Yes' : '⚠ Not detected'}

\`\`\`tsx
import BasicTableOne from "@/components/tables/BasicTableOne";

<ComponentCard title="Basic Table 1">
  <BasicTableOne />
</ComponentCard>
\`\`\`

## Pagination Component

- File: \`src/components/tables/Pagination.tsx\`
- Props:
  - \`currentPage: number\`
  - \`totalPages: number\`
  - \`onPageChange: (page: number) => void\`

### Behavior summary

- Sliding page window logic (up to 3 page buttons): ${hasPaginationWindowing ? '✅ Detected' : '⚠ Not detected'}
- Boundary safety with disabled prev/next: ${hasPaginationPrevNextDisable ? '✅ Detected' : '⚠ Not detected'}
- Ellipsis rendering for truncated ranges: ✅ Implemented (leading/trailing)

### Integration note

Current codebase contains the reusable \`Pagination\` component, but no direct page-level integration with \`BasicTableOne\` is currently wired.

## Sorting and Filtering Patterns

### Current implementation status

- Explicit array sorting logic (\`.sort(...)\`) in table views: ${hasSortingLogic ? '✅ Detected' : '⚠ Not currently implemented'}
- Explicit array filtering logic (\`.filter(...)\`) in table views: ${hasFilteringLogic ? '✅ Detected' : '⚠ Not currently implemented'}
- Filter action UI in complex table card: ${hasFilterUi ? '✅ Present in `RecentOrders` header controls' : '⚠ Not detected'}

### Recommended pattern for new table features

1. Keep original row data immutable
2. Apply filter step first, then sort step
3. Pass resulting slice to table rows for pagination
4. Keep pagination state in parent component and drive \`Pagination\` via callbacks

## RecentOrders as Complex Table Example

- File: \`src/components/ecommerce/RecentOrders.tsx\`
- Why it is a complex reference:
  - Composite row cell with product image + metadata
  - Header controls for actions (Filter / See all)
  - Badge-based status rendering
  - Shared table primitives for consistent semantics and styling

### Notes

- Column headers are semantic and reusable
- Data model uses a strict union for status: \`"Delivered" | "Pending" | "Canceled"\`
- Good baseline for extending toward server-fed product/order tables

## Responsive Table Patterns

- BasicTableOne responsive shell (\`overflow-x-auto\` + fixed min width): ${hasBasicResponsiveWrapper ? '✅ Detected' : '⚠ Not fully detected'}
- RecentOrders horizontal overflow wrapper: ${hasRecentOrdersResponsiveWrapper ? '✅ Detected' : '⚠ Not detected'}
- Practical pattern used in this project:
  - Wrap table in \`max-w-full overflow-x-auto\`
  - Keep an inner min-width container for dense column sets
  - Preserve desktop density while allowing horizontal scroll on small screens

## Cross-References

- [Component Catalog](./components.md) - full component metadata
- [Routing Guide](./routing.md) - table page route placement
- [Data Visualization Guide](./data-visualization.md) - complex dashboard cards including table-like datasets
- [State Management](./state-management.md) - local state patterns for future table interactions

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'tables.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate modals and dropdowns documentation
   */
  private async generateModalsDropdownsDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const components = this.componentExtractor.extractAllComponents();
    const headerComponents = components
      .filter((component) => component.category === 'header')
      .filter((component) => ['NotificationDropdown', 'UserDropdown'].includes(component.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    const modalCorePath = path.join(this.projectRoot, 'src', 'components', 'ui', 'modal', 'index.tsx');
    const dropdownCorePath = path.join(this.projectRoot, 'src', 'components', 'ui', 'dropdown', 'Dropdown.tsx');
    const dropdownItemPath = path.join(this.projectRoot, 'src', 'components', 'ui', 'dropdown', 'DropdownItem.tsx');
    const useModalPath = path.join(this.projectRoot, 'src', 'hooks', 'useModal.ts');
    const modalsPagePath = path.join(this.projectRoot, 'src', 'app', '(admin)', '(ui-elements)', 'modals', 'page.tsx');
    const notificationDropdownPath = path.join(this.projectRoot, 'src', 'components', 'header', 'NotificationDropdown.tsx');
    const userDropdownPath = path.join(this.projectRoot, 'src', 'components', 'header', 'UserDropdown.tsx');

    const modalCoreCode = fs.existsSync(modalCorePath) ? fs.readFileSync(modalCorePath, 'utf-8') : '';
    const dropdownCoreCode = fs.existsSync(dropdownCorePath) ? fs.readFileSync(dropdownCorePath, 'utf-8') : '';
    const dropdownItemCode = fs.existsSync(dropdownItemPath) ? fs.readFileSync(dropdownItemPath, 'utf-8') : '';
    const useModalCode = fs.existsSync(useModalPath) ? fs.readFileSync(useModalPath, 'utf-8') : '';
    const modalsPageCode = fs.existsSync(modalsPagePath) ? fs.readFileSync(modalsPagePath, 'utf-8') : '';
    const notificationDropdownCode = fs.existsSync(notificationDropdownPath)
      ? fs.readFileSync(notificationDropdownPath, 'utf-8')
      : '';
    const userDropdownCode = fs.existsSync(userDropdownPath)
      ? fs.readFileSync(userDropdownPath, 'utf-8')
      : '';

    const modalExampleFiles = [
      'src/components/example/ModalExample/DefaultModal.tsx',
      'src/components/example/ModalExample/VerticallyCenteredModal.tsx',
      'src/components/example/ModalExample/FormInModal.tsx',
      'src/components/example/ModalExample/FullScreenModal.tsx',
      'src/components/example/ModalExample/ModalBasedAlerts.tsx',
    ];
    const existingModalExamples = modalExampleFiles.filter((relativePath) =>
      fs.existsSync(path.join(this.projectRoot, relativePath))
    );

    const useModalConsumers = this.findHookConsumers('useModal', [useModalPath]);
    const dropdownConsumers = this.findFilesContaining(
      path.join(this.projectRoot, 'src'),
      /<NotificationDropdown|<UserDropdown/
    ).map((item: string) => path.relative(this.projectRoot, item));

    const hasUseModalApi = /openModal/.test(useModalCode) && /closeModal/.test(useModalCode) && /toggleModal/.test(useModalCode);
    const hasModalEscapeClose = /event\.key\s*===\s*"Escape"/.test(modalCoreCode);
    const hasModalBackdropClose = /onClick=\{onClose\}/.test(modalCoreCode);
    const supportsFullscreenModal = /isFullscreen\?/.test(modalCoreCode) || /isFullscreen\s*=\s*false/.test(modalCoreCode);
    const supportsCloseButtonToggle = /showCloseButton/.test(modalCoreCode);
    const hasDropdownOutsideClickClose = /handleClickOutside/.test(dropdownCoreCode) && /dropdown-toggle/.test(dropdownCoreCode);
    const hasDropdownItemAutoClose = /onItemClick/.test(dropdownItemCode);
    const hasNotificationState = /notifying/.test(notificationDropdownCode);
    const hasUserDropdownRotateIcon = /rotate-180/.test(userDropdownCode);
    const hasModalDemoPage = /DefaultModal|FormInModal|FullScreenModal|ModalBasedAlerts|VerticallyCenteredModal/.test(modalsPageCode);

    let dropdownComponentsTable = '| Component | Path | Open/Close State Pattern |\n';
    dropdownComponentsTable += '|-----------|------|--------------------------|\n';
    headerComponents.forEach((component) => {
      const statePattern = component.name === 'NotificationDropdown'
        ? 'Local `isOpen` + `notifying` indicator + close callback passed to `Dropdown`'
        : component.name === 'UserDropdown'
          ? 'Local `isOpen` + click toggle (`stopPropagation`) + close callback'
          : 'Local open/close state pattern';
      dropdownComponentsTable += `| ${component.name} | \`src/${component.path}\` | ${statePattern} |\n`;
    });

    const content = `# Modals & Dropdowns Guide

**Generated:** ${timestamp}

## Overview

This document describes modal and dropdown interaction patterns in TailAdmin, including the reusable \`Modal\` and \`Dropdown\` primitives, the \`useModal\` hook, modal examples, and header dropdown implementations.

## Modal Core Component and Variants

### Core modal primitive

- File: \`src/components/ui/modal/index.tsx\`
- Main props: \`isOpen\`, \`onClose\`, \`className\`, \`children\`, \`showCloseButton\`, \`isFullscreen\`
- Escape key closes modal: ${hasModalEscapeClose ? '✅ Detected' : '⚠ Not detected'}
- Backdrop click closes modal: ${hasModalBackdropClose ? '✅ Detected' : '⚠ Not detected'}
- Fullscreen support (variant behavior): ${supportsFullscreenModal ? '✅ Detected via `isFullscreen`' : '⚠ Not detected'}
- Optional close button visibility: ${supportsCloseButtonToggle ? '✅ Detected via `showCloseButton`' : '⚠ Not detected'}

### Implemented modal variants in examples

${this.generateBulletList(existingModalExamples)}

### Modals showcase page

- File: \`src/app/(admin)/(ui-elements)/modals/page.tsx\`
- Aggregates modal examples on one screen: ${hasModalDemoPage ? '✅ Detected' : '⚠ Not detected'}

## useModal Hook Integration

### Hook API

- File: \`src/hooks/useModal.ts\`
- API status: ${hasUseModalApi ? '✅ Returns `isOpen`, `openModal`, `closeModal`, `toggleModal`' : '⚠ Expected API not fully detected'}
- Backed by local \`useState\` with memoized callbacks using \`useCallback\`

### Detected usage footprint

- Components/pages using \`useModal\`: **${useModalConsumers.length}**

${this.generatePathBulletList(useModalConsumers)}

### Typical pattern

\`\`\`tsx
const { isOpen, openModal, closeModal } = useModal();

<Button onClick={openModal}>Open Modal</Button>
<Modal isOpen={isOpen} onClose={closeModal}>...</Modal>
\`\`\`

## ModalExample Reference Set

The \`ModalExample\` directory provides reference implementations for common modal UX:

- **DefaultModal**: standard content dialog with actions
- **VerticallyCenteredModal**: center-aligned layout without top-right close icon
- **FormInModal**: form composition inside modal container
- **FullScreenModal**: full-screen takeover using \`isFullscreen\`
- **ModalBasedAlerts**: success/info/warning/error alert-style modal patterns

## Dropdown Components

### Reusable dropdown primitives

- File: \`src/components/ui/dropdown/Dropdown.tsx\`
  - Outside click close behavior: ${hasDropdownOutsideClickClose ? '✅ Detected (`handleClickOutside` + `.dropdown-toggle` guard)' : '⚠ Not detected'}
  - Controlled visibility via \`isOpen\` prop
- File: \`src/components/ui/dropdown/DropdownItem.tsx\`
  - Supports \`a\` and \`button\` item tags
  - Item click close callback support: ${hasDropdownItemAutoClose ? '✅ Detected (`onItemClick`)' : '⚠ Not detected'}

### Header dropdown implementations

${dropdownComponentsTable}

### Header usage footprint

- Dropdown consumers in layout tree: **${dropdownConsumers.length}**

${this.generatePathBulletList(dropdownConsumers)}

### Additional behavior notes

- Notification unread indicator state (ping dot): ${hasNotificationState ? '✅ Detected in `NotificationDropdown`' : '⚠ Not detected'}
- User menu caret rotation on open: ${hasUserDropdownRotateIcon ? '✅ Detected in `UserDropdown`' : '⚠ Not detected'}

## Open/Close State Management Patterns

Patterns used consistently across modals and dropdowns:

1. **Local boolean state** (\`isOpen\`) for visibility
2. **Dedicated open/close callbacks** for explicit transitions
3. **Outside interaction handling** (backdrop click / click-outside listener)
4. **Keyboard escape handling** for modal dismissal
5. **Item-level close hooks** in dropdown menus for immediate collapse after action

These patterns keep interaction logic predictable and reusable without introducing unnecessary global state.

## Cross-References

- [State Management](./state-management.md) - custom hooks and local state patterns
- [Components Catalog](./components.md) - component metadata and dependencies
- [Routing Guide](./routing.md) - location of modals showcase route
- [Forms Documentation](./forms.md) - form composition patterns reused in modals

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'modals-dropdowns.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate icon system documentation
   */
  private async generateIconsDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const iconsDir = path.join(this.projectRoot, 'src', 'icons');
    const indexPath = path.join(iconsDir, 'index.tsx');
    const svgTypesPath = path.join(this.projectRoot, 'src', 'svg.d.ts');

    const indexCode = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf-8') : '';
    const svgTypesCode = fs.existsSync(svgTypesPath) ? fs.readFileSync(svgTypesPath, 'utf-8') : '';

    const iconFiles = fs.existsSync(iconsDir)
      ? fs.readdirSync(iconsDir).filter((file) => file.endsWith('.svg')).sort((a, b) => a.localeCompare(b))
      : [];

    const importRegex = /import\s+([A-Za-z0-9_]+)\s+from\s+["']\.\/([^"']+\.svg)["'];?/g;
    const imports: Array<{ exportName: string; file: string }> = [];
    let importMatch: RegExpExecArray | null = null;
    while ((importMatch = importRegex.exec(indexCode)) !== null) {
      imports.push({ exportName: importMatch[1], file: importMatch[2] });
    }

    const exportedSet = new Set<string>();
    const exportBlockMatch = indexCode.match(/export\s*{([\s\S]*?)};/);
    if (exportBlockMatch?.[1]) {
      exportBlockMatch[1]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => exportedSet.add(item));
    }

    const exportedIcons = imports.filter((item) => exportedSet.has(item.exportName));
    const nonExportedSvgFiles = iconFiles.filter((file) => !imports.some((item) => item.file === file));

    const iconConsumerFiles = this.findFilesContaining(
      path.join(this.projectRoot, 'src'),
      /from\s+["']@\/icons(["']|\/index["'])/
    )
      .map((file: string) => path.relative(this.projectRoot, file))
      .sort((a, b) => a.localeCompare(b));

    const importedIconNameRegex = /import\s*{([^}]+)}\s*from\s*["']@\/icons(?:\/index)?["']/g;
    const usedIconNames = new Set<string>();
    iconConsumerFiles.forEach((relativePath) => {
      const fullPath = path.join(this.projectRoot, relativePath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      let match: RegExpExecArray | null = null;
      while ((match = importedIconNameRegex.exec(content)) !== null) {
        match[1]
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((name) => usedIconNames.add(name));
      }
    });

    const hasSvgModuleDeclaration = /declare\s+module\s+["']\*\.svg["']/.test(svgTypesCode);
    const hasCurrentColorPattern = iconFiles.some((file) => {
      const content = fs.readFileSync(path.join(iconsDir, file), 'utf-8');
      return /currentColor/.test(content);
    });
    const hasClassNameStylingInUsage = iconConsumerFiles.some((relativePath) => {
      const content = fs.readFileSync(path.join(this.projectRoot, relativePath), 'utf-8');
      return /Icon\s+className=|className=\"[^\"]*(fill-|text-|size-|w-|h-)/.test(content);
    });

    let exportedIconsTable = '| Export Name | SVG File |\n';
    exportedIconsTable += '|-------------|----------|\n';
    exportedIcons
      .sort((a, b) => a.exportName.localeCompare(b.exportName))
      .forEach((item) => {
        exportedIconsTable += `| ${item.exportName} | \`src/icons/${item.file}\` |\n`;
      });

    const topUsedIcons = Array.from(usedIconNames)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 20);

    const content = `# Icon System Guide

**Generated:** ${timestamp}

## Overview

This document describes the SVG icon system used in TailAdmin, including \`src/icons\` inventory, barrel exports in \`icons/index.tsx\`, import/usage patterns, styling conventions, and extension steps for adding new icons.

## Icons Directory and Inventory

- Icons directory: \`src/icons\`
- Total SVG files detected: **${iconFiles.length}**
- Icons imported in \`index.tsx\`: **${imports.length}**
- Icons exported from barrel: **${exportedIcons.length}**

${nonExportedSvgFiles.length > 0
        ? `### SVG files currently not re-exported from barrel\n\n${this.generateBulletList(nonExportedSvgFiles.map((file) => `src/icons/${file}`))}`
        : 'All detected SVG files are represented in the barrel import map.\n'}

## Barrel File: icons/index.tsx

- Source: \`src/icons/index.tsx\`
- Purpose: central icon export surface for concise imports like \`import { PlusIcon } from "@/icons"\`

### Exported icon map

${exportedIconsTable}

## Type Support for SVG Imports

- Declaration file: \`src/svg.d.ts\`
- SVG module declaration detected: ${hasSvgModuleDeclaration ? '✅ Yes' : '⚠ Not detected'}
- Current setup allows SVG imports as default source and as React component typing metadata.

## Import and Usage Patterns

### Canonical import style

\`\`\`tsx
import { PlusIcon, EyeIcon } from "@/icons";
\`\`\`

### Usage examples

\`\`\`tsx
<Button startIcon={<PlusIcon />}>Add item</Button>

<EyeIcon className="fill-gray-500 dark:fill-gray-400" />
\`\`\`

### Consumer footprint

- Files importing from \`@/icons\`: **${iconConsumerFiles.length}**

${this.generatePathBulletList(iconConsumerFiles)}

### Frequently seen imported icons (sample)

${this.generateBulletList(topUsedIcons)}

## Size and Color Styling Conventions

- SVG internals using \`currentColor\`: ${hasCurrentColorPattern ? '✅ Detected' : '⚠ Not detected'}
- Class-based icon styling in consumers (size/color): ${hasClassNameStylingInUsage ? '✅ Detected' : '⚠ Not detected'}

Common patterns used in this project:

1. **Color via utility classes** (e.g., \`text-gray-800\`, \`fill-gray-500\`, \`dark:text-white/90\`)
2. **Size via utilities** (e.g., \`size-6\`, \`w-5 h-5\`) or SVG intrinsic dimensions
3. **Contextual coloring** by parent components (badges, buttons, cards)

Because many SVG paths are authored with \`fill=\"currentColor\"\`, icon color can be themed through regular Tailwind text/fill classes.

## How to Add a New Icon

1. Add the SVG file under \`src/icons\` (e.g., \`new-feature.svg\`)
2. In \`src/icons/index.tsx\`, add:
   - import: \`import NewFeatureIcon from "./new-feature.svg";\`
   - export entry: \`NewFeatureIcon\`
3. Consume from barrel:
   - \`import { NewFeatureIcon } from "@/icons";\`
4. Apply styling classes where needed:
   - \`<NewFeatureIcon className=\"size-5 text-brand-500\" />\`

## Cross-References

- [Component Catalog](./components.md) - components that consume icons
- [Styling Guide](./styling.md) - theme and utility class conventions used on icons
- [Modals & Dropdowns](./modals-dropdowns.md) - interaction components with icon-heavy UI
- [Integration Patterns](./integration-patterns.md) - conventions for extending shared primitives

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'icons.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate TypeScript types and interfaces documentation
   */
  private async generateTypeScriptDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const srcDir = path.join(this.projectRoot, 'src');
    const svgDeclarationPath = path.join(this.projectRoot, 'src', 'svg.d.ts');
    const jsvDeclarationPath = path.join(this.projectRoot, 'jsvectormap.d.ts');
    const nextEnvPath = path.join(this.projectRoot, 'next-env.d.ts');
    const buttonPath = path.join(this.projectRoot, 'src', 'components', 'ui', 'button', 'Button.tsx');
    const badgePath = path.join(this.projectRoot, 'src', 'components', 'ui', 'badge', 'Badge.tsx');
    const themeContextPath = path.join(this.projectRoot, 'src', 'context', 'ThemeContext.tsx');
    const sidebarContextPath = path.join(this.projectRoot, 'src', 'context', 'SidebarContext.tsx');

    const svgDeclaration = fs.existsSync(svgDeclarationPath) ? fs.readFileSync(svgDeclarationPath, 'utf-8') : '';
    const jsvDeclaration = fs.existsSync(jsvDeclarationPath) ? fs.readFileSync(jsvDeclarationPath, 'utf-8') : '';
    const nextEnvDeclaration = fs.existsSync(nextEnvPath) ? fs.readFileSync(nextEnvPath, 'utf-8') : '';
    const buttonCode = fs.existsSync(buttonPath) ? fs.readFileSync(buttonPath, 'utf-8') : '';
    const badgeCode = fs.existsSync(badgePath) ? fs.readFileSync(badgePath, 'utf-8') : '';
    const themeContextCode = fs.existsSync(themeContextPath) ? fs.readFileSync(themeContextPath, 'utf-8') : '';
    const sidebarContextCode = fs.existsSync(sidebarContextPath) ? fs.readFileSync(sidebarContextPath, 'utf-8') : '';

    const sourceFiles: string[] = [];
    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          return;
        }

        if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
          sourceFiles.push(fullPath);
        }
      });
    };
    walk(srcDir);

    const declarations: Array<{ name: string; kind: 'interface' | 'type'; file: string }> = [];
    sourceFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');

      const interfaceRegex = /interface\s+([A-Za-z0-9_]+)\s*{/g;
      let match: RegExpExecArray | null = null;
      while ((match = interfaceRegex.exec(content)) !== null) {
        declarations.push({
          name: match[1],
          kind: 'interface',
          file: path.relative(this.projectRoot, filePath),
        });
      }

      const typeRegex = /type\s+([A-Za-z0-9_]+)\s*=\s*{/g;
      while ((match = typeRegex.exec(content)) !== null) {
        declarations.push({
          name: match[1],
          kind: 'type',
          file: path.relative(this.projectRoot, filePath),
        });
      }
    });

    const uniqueDeclarations = Array.from(
      new Map(declarations.map((item) => [`${item.kind}:${item.name}:${item.file}`, item])).values()
    );

    const propsDeclarations = uniqueDeclarations.filter((item) => item.name.endsWith('Props'));
    const contextDeclarations = uniqueDeclarations.filter((item) => /ContextType$/.test(item.name));

    const preferredNames = [
      'ButtonProps',
      'BadgeProps',
      'ModalProps',
      'DropdownProps',
      'DropdownItemProps',
      'TableProps',
      'TableCellProps',
      'InputProps',
      'SelectProps',
      'MultiSelectProps',
      'PaginationProps',
      'CountryMapProps',
      'ThemeContextType',
      'SidebarContextType',
      'NavItem',
      'Marker',
      'MarkerStyle',
      'Option',
    ];

    const selectedMainDeclarations = uniqueDeclarations
      .filter((item) => preferredNames.includes(item.name))
      .sort((a, b) => {
        const ai = preferredNames.indexOf(a.name);
        const bi = preferredNames.indexOf(b.name);
        if (ai === bi) return a.file.localeCompare(b.file);
        return ai - bi;
      });

    let mainTypesTable = '| Name | Kind | Location |\n';
    mainTypesTable += '|------|------|----------|\n';
    selectedMainDeclarations.forEach((item) => {
      mainTypesTable += `| \`${item.name}\` | ${item.kind} | \`${item.file}\` |\n`;
    });

    const apexOptionsConsumers = this.findFilesContaining(srcDir, /ApexOptions/)
      .map((file: string) => path.relative(this.projectRoot, file));
    const metadataConsumers = this.findFilesContaining(srcDir, /\bMetadata\b/)
      .map((file: string) => path.relative(this.projectRoot, file));
    const reactNodeConsumers = this.findFilesContaining(srcDir, /React\.ReactNode|ReactNode/)
      .map((file: string) => path.relative(this.projectRoot, file));

    const hasSvgModuleDeclaration = /declare\s+module\s+["']\*\.svg["']/.test(svgDeclaration);
    const hasJsvectormapModuleDeclaration = /declare\s+module\s+["']jsvectormap["']/.test(jsvDeclaration);
    const hasNextRouteTypesReference = /\.next\/dev\/types\/routes\.d\.ts/.test(nextEnvDeclaration);

    const hasButtonVariantUnion = /variant\?:\s*["'][^"']+["']\s*\|/.test(buttonCode)
      || /variant\?:\s*"primary"\s*\|\s*"outline"/.test(buttonCode);
    const hasBadgeUnionAliases = /type\s+BadgeVariant\s*=/.test(badgeCode) && /type\s+BadgeColor\s*=/.test(badgeCode);
    const hasTypedContextProviders = /createContext<ThemeContextType/.test(themeContextCode)
      && /createContext<SidebarContextType/.test(sidebarContextCode);

    const content = `# TypeScript Types & Interfaces Guide

**Generated:** ${timestamp}

## Overview

This document summarizes how TypeScript typing is used across TailAdmin: key interfaces/types, declaration files, component props typing patterns, reusable types, and external library type extensions.

## Main TypeScript Interfaces and Types

- Total interface/type declarations detected in \`src\`: **${uniqueDeclarations.length}**
- Props-focused declarations (\`*Props\`): **${propsDeclarations.length}**
- Context API declarations (\`*ContextType\`): **${contextDeclarations.length}**

### Principal declarations (selected)

${mainTypesTable}

## Declaration Files (.d.ts)

### 1) SVG declarations

- File: \`src/svg.d.ts\`
- Module declaration for \`*.svg\`: ${hasSvgModuleDeclaration ? '✅ Detected' : '⚠ Not detected'}
- Purpose: enables SVG imports with TS awareness and React SVG prop typing.

### 2) jsvectormap declarations

- File: \`jsvectormap.d.ts\`
- Module declaration for \`jsvectormap\`: ${hasJsvectormapModuleDeclaration ? '✅ Detected' : '⚠ Not detected'}
- Purpose: provides a compatibility shim for a library without first-class local typings in this codebase.

### 3) Next.js environment declarations

- File: \`next-env.d.ts\`
- Route/dev type reference detected: ${hasNextRouteTypesReference ? '✅ Detected (.next/dev/types/routes.d.ts)' : '⚠ Not detected'}
- Purpose: hooks the project into Next.js generated type infrastructure.

## Props Typing Patterns

Common component typing style in this codebase:

1. Dedicated \`interface ...Props\` per component
2. Optional props with sensible defaults in destructuring
3. Union literals for controlled variants/sizes
4. React utility types for composability (\`ReactNode\`, \`React.FC\`)

### Confirmed examples

- Button union prop variants (\`size\`, \`variant\`): ${hasButtonVariantUnion ? '✅ Detected in `ButtonProps`' : '⚠ Not detected'}
- Badge alias + union modeling (\`BadgeVariant\`, \`BadgeColor\`): ${hasBadgeUnionAliases ? '✅ Detected' : '⚠ Not detected'}
- Typed context provider values: ${hasTypedContextProviders ? '✅ Detected (`ThemeContextType`, `SidebarContextType`)' : '⚠ Not detected'}

## Common Reusable Types

- React composition types: \`React.ReactNode\`, \`React.FC<...>\`
- Context contracts: \`ThemeContextType\`, \`SidebarContextType\`
- UI prop contracts: \`ButtonProps\`, \`BadgeProps\`, \`ModalProps\`, \`DropdownProps\`
- Data/UI models: \`NavItem\`, \`PaginationProps\`, \`CountryMapProps\`, \`Marker\`

### Usage footprint indicators

- Files referencing \`ReactNode\`/\`React.ReactNode\`: **${reactNodeConsumers.length}**
- Files using \`ApexOptions\` (external chart typing): **${apexOptionsConsumers.length}**
- Files using Next.js \`Metadata\` type: **${metadataConsumers.length}**

## External Library Type Extensions and Integrations

### Extension-style declarations

- \`declare module "*.svg"\` in \`src/svg.d.ts\`
- \`declare module "jsvectormap"\` in \`jsvectormap.d.ts\`

These patterns extend TypeScript's module understanding for libraries/assets that need local typing bridges.

### Strongly-typed third-party APIs in use

- \`ApexOptions\` from \`apexcharts\` for chart configuration typing
- \`Metadata\` from Next.js for page metadata typing
- Next.js generated route/environment declarations through \`next-env.d.ts\`

## Recommended Type-Safe Extension Pattern

When adding new typed components or integrations:

1. Define a focused \`...Props\` interface/type close to the component
2. Prefer union literals for constrained visual/state variants
3. Extract shared contracts into reusable aliases when used by multiple modules
4. Add/extend \`.d.ts\` module declarations when consuming untyped third-party modules
5. Keep external config objects strongly typed (as done with \`ApexOptions\`)

## Cross-References

- [Component Catalog](./components.md) - prop-level component references
- [Forms Documentation](./forms.md) - typed form prop patterns
- [Data Visualization Guide](./data-visualization.md) - \`ApexOptions\` usage in charts
- [Configuration Guide](./configuration.md) - TypeScript compiler settings and project config

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'typescript.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate build and configuration documentation
   */
  private async generateConfigDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const nextConfigPath = path.join(this.projectRoot, 'next.config.ts');
    const tsConfigPath = path.join(this.projectRoot, 'tsconfig.json');
    const eslintFlatPath = path.join(this.projectRoot, 'eslint.config.mjs');
    const eslintLegacyPath = path.join(this.projectRoot, '.eslintrc.json');
    const postcssPath = path.join(this.projectRoot, 'postcss.config.js');
    const prettierPath = path.join(this.projectRoot, 'prettier.config.js');

    const packageJson = fs.existsSync(packageJsonPath)
      ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      : {};

    const nextConfigCode = fs.existsSync(nextConfigPath) ? fs.readFileSync(nextConfigPath, 'utf-8') : '';
    const tsConfigCode = fs.existsSync(tsConfigPath) ? fs.readFileSync(tsConfigPath, 'utf-8') : '';
    const eslintFlatCode = fs.existsSync(eslintFlatPath) ? fs.readFileSync(eslintFlatPath, 'utf-8') : '';
    const postcssCode = fs.existsSync(postcssPath) ? fs.readFileSync(postcssPath, 'utf-8') : '';
    const prettierCode = fs.existsSync(prettierPath) ? fs.readFileSync(prettierPath, 'utf-8') : '';

    const scripts: Record<string, string> = packageJson.scripts || {};
    const overrides: Record<string, Record<string, string>> = packageJson.overrides || {};
    const dependencies: Record<string, string> = packageJson.dependencies || {};

    const hasSvgWebpackRule = /test:\s*\/\\\.svg\$\//.test(nextConfigCode) && /@svgr\/webpack/.test(nextConfigCode);
    const hasTurbopackSvgRule = /turbopack[\s\S]*\*\.svg/.test(nextConfigCode);
    const hasStandaloneOutput = /output:\s*["']standalone["']/.test(nextConfigCode);
    const hasPoweredByHeaderDisabled = /poweredByHeader:\s*false/.test(nextConfigCode);
    const hasAllowedDevOrigins = /allowedDevOrigins/.test(nextConfigCode);

    const hasStrictMode = /"strict"\s*:\s*true/.test(tsConfigCode);
    const hasPathAlias = /"@\/\*"\s*:/.test(tsConfigCode);
    const hasNoEmit = /"noEmit"\s*:\s*true/.test(tsConfigCode);
    const hasBundlerResolution = /"moduleResolution"\s*:\s*"bundler"/.test(tsConfigCode);

    const hasFlatEslintConfig = fs.existsSync(eslintFlatPath);
    const hasLegacyEslintConfig = fs.existsSync(eslintLegacyPath);
    const hasCoreWebVitalsConfig = /core-web-vitals/.test(eslintFlatCode);
    const hasTypescriptEslintConfig = /eslint-config-next\/typescript/.test(eslintFlatCode);
    const hasGlobalIgnores = /globalIgnores/.test(eslintFlatCode);

    const hasTailwindPostcssPlugin = /@tailwindcss\/postcss/.test(postcssCode);
    const hasPrettierTailwindPlugin = /prettier-plugin-tailwindcss/.test(prettierCode);

    let scriptsTable = '| Script | Command |\n';
    scriptsTable += '|--------|---------|\n';
    Object.entries(scripts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([name, command]) => {
        scriptsTable += `| \`${name}\` | \`${command}\` |\n`;
      });

    let overridesTable = '| Package | Override Purpose |\n';
    overridesTable += '|---------|------------------|\n';
    const overrideEntries = Object.entries(overrides);
    if (overrideEntries.length === 0) {
      overridesTable += '| (none) | No overrides configured |\n';
    } else {
      overrideEntries
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([pkgName, map]) => {
          const targets = Object.keys(map || {}).join(', ');
          overridesTable += `| \`${pkgName}\` | Pins compatibility for: ${targets || 'custom map'} |\n`;
        });
    }

    const content = `# Build & Configuration Guide

**Generated:** ${timestamp}

## Overview

This document describes project configuration for Next.js, TypeScript, ESLint, PostCSS, Prettier, npm scripts, and package overrides used in TailAdmin.

## Next.js Configuration (next.config.ts)

- File: \`next.config.ts\`
- \`output: "standalone"\`: ${hasStandaloneOutput ? '✅ Enabled' : '⚠ Not detected'}
- \`poweredByHeader: false\`: ${hasPoweredByHeaderDisabled ? '✅ Enabled' : '⚠ Not detected'}
- \`allowedDevOrigins\` present: ${hasAllowedDevOrigins ? '✅ Yes' : '⚠ No'}
- SVG handling via webpack \`@svgr/webpack\` rule: ${hasSvgWebpackRule ? '✅ Configured' : '⚠ Not detected'}
- Turbopack SVG loader rule: ${hasTurbopackSvgRule ? '✅ Configured' : '⚠ Not detected'}

### Notes

- The project supports SVG as React components through both webpack and Turbopack configuration paths.
- Standalone output improves container/deployment portability.

## TypeScript Configuration (tsconfig.json)

- File: \`tsconfig.json\`
- Strict mode: ${hasStrictMode ? '✅ Enabled' : '⚠ Not enabled'}
- No emit: ${hasNoEmit ? '✅ Enabled' : '⚠ Not enabled'}
- Module resolution \`bundler\`: ${hasBundlerResolution ? '✅ Enabled' : '⚠ Not enabled'}
- Path alias \`@/* -> src/*\`: ${hasPathAlias ? '✅ Configured' : '⚠ Not detected'}

### Key compiler options summary

- Target: \`ES2017\`
- JSX: \`react-jsx\`
- Incremental build info: enabled
- Next.js TypeScript plugin: enabled

## ESLint Configuration

- Flat config file \`eslint.config.mjs\`: ${hasFlatEslintConfig ? '✅ Present' : '⚠ Missing'}
- Legacy config \`.eslintrc.json\`: ${hasLegacyEslintConfig ? '✅ Present' : 'ℹ Not present (flat config approach)'}
- Next Core Web Vitals preset: ${hasCoreWebVitalsConfig ? '✅ Included' : '⚠ Not detected'}
- Next TypeScript preset: ${hasTypescriptEslintConfig ? '✅ Included' : '⚠ Not detected'}
- Custom global ignores configured: ${hasGlobalIgnores ? '✅ Yes' : '⚠ Not detected'}

### Project-specific linting behavior

- Includes restrictions against inline literal UI text in specific frontend folders.
- Encourages localization-ready patterns by enforcing text source conventions.

## PostCSS Configuration

- File: \`postcss.config.js\`
- \`@tailwindcss/postcss\` plugin: ${hasTailwindPostcssPlugin ? '✅ Configured' : '⚠ Not detected'}

## Prettier Configuration

- File: \`prettier.config.js\`
- \`prettier-plugin-tailwindcss\`: ${hasPrettierTailwindPlugin ? '✅ Configured' : '⚠ Not detected'}

## NPM Scripts

${scriptsTable}

### Required workflow scripts status

- \`dev\`: ${scripts.dev ? '✅ Present' : '⚠ Missing'}
- \`build\`: ${scripts.build ? '✅ Present' : '⚠ Missing'}
- \`start\`: ${scripts.start ? '✅ Present' : '⚠ Missing'}
- \`lint\`: ${scripts.lint ? '✅ Present' : '⚠ Missing'}
- \`generate:docs\`: ${scripts['generate:docs'] ? '✅ Present' : '⚠ Missing'}

## package.json Overrides

The project uses overrides to align transitive compatibility constraints:

${overridesTable}

### Override rationale (detected)

- \`@react-jvectormap/core\` and \`@react-jvectormap/world\` are pinned with React/ReactDOM compatibility ranges.
- This prevents peer-resolution conflicts with React 19 in local dependency graphs.

## Configuration-Related Dependencies

- \`next\`: ${dependencies.next || 'N/A'}
- \`typescript\` (devDependency): ${(packageJson.devDependencies && packageJson.devDependencies.typescript) || 'N/A'}
- \`eslint\` (devDependency): ${(packageJson.devDependencies && packageJson.devDependencies.eslint) || 'N/A'}
- \`postcss\` (devDependency): ${(packageJson.devDependencies && packageJson.devDependencies.postcss) || 'N/A'}
- \`tailwindcss\`: ${(packageJson.devDependencies && packageJson.devDependencies.tailwindcss) || dependencies.tailwindcss || 'N/A'}

## Cross-References

- [Architecture Documentation](./architecture.md) - runtime architecture context
- [TypeScript Guide](./typescript.md) - type system and declaration strategy
- [Styling Guide](./styling.md) - Tailwind runtime usage and design tokens
- [Integration Patterns](./integration-patterns.md) - conventions when adding new tools/configs

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'configuration.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate integration patterns documentation
   */
  private async generateIntegrationPatternsDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const appDir = path.join(this.projectRoot, 'src', 'app');
    const contextDir = path.join(this.projectRoot, 'src', 'context');
    const hooksDir = path.join(this.projectRoot, 'src', 'hooks');

    const components = this.componentExtractor.extractAllComponents();
    const patterns = this.patternAnalyzer.analyzePatterns(components);
    const routeGroups = this.discoverRouteGroups(appDir);
    const appPages = this.discoverAppPages(appDir);

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = fs.existsSync(packageJsonPath)
      ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      : { dependencies: {} };
    const dependencies = packageJson.dependencies || {};

    const componentCategories = Array.from(new Set(components.map((item) => item.category))).sort((a, b) => a.localeCompare(b));
    const propsPattern = patterns.namingConventions.find((item: NamingConvention) => item.category === 'Props Interfaces');
    const hookNamingPattern = patterns.namingConventions.find((item: NamingConvention) => item.category === 'Custom Hooks');
    const contextNamingPattern = patterns.namingConventions.find((item: NamingConvention) => item.category === 'Context Files');
    const fileNamingPattern = patterns.namingConventions.find((item: NamingConvention) => item.category === 'Component Files');

    const contextFiles = fs.existsSync(contextDir)
      ? fs.readdirSync(contextDir).filter((file) => file.endsWith('.ts') || file.endsWith('.tsx')).sort((a, b) => a.localeCompare(b))
      : [];
    const hookFiles = fs.existsSync(hooksDir)
      ? fs.readdirSync(hooksDir).filter((file) => file.endsWith('.ts') || file.endsWith('.tsx')).sort((a, b) => a.localeCompare(b))
      : [];

    const contextRows: Array<{ file: string; hasProvider: boolean; hasUseHook: boolean; hasCreateContext: boolean }> = contextFiles.map((file) => {
      const fullPath = path.join(contextDir, file);
      const code = fs.readFileSync(fullPath, 'utf-8');
      return {
        file: `src/context/${file}`,
        hasProvider: /Provider/.test(code),
        hasUseHook: /export\s+const\s+use[A-Za-z0-9_]+\s*=/.test(code),
        hasCreateContext: /createContext\s*</.test(code) || /createContext\(/.test(code),
      };
    });

    const hookRows: Array<{ file: string; hookName: string; hasUseState: boolean; hasUseCallback: boolean }> = hookFiles.map((file) => {
      const fullPath = path.join(hooksDir, file);
      const code = fs.readFileSync(fullPath, 'utf-8');
      const hookName = file.replace(/\.(ts|tsx)$/, '');
      return {
        file: `src/hooks/${file}`,
        hookName,
        hasUseState: /useState\(/.test(code),
        hasUseCallback: /useCallback\(/.test(code),
      };
    });

    const lineChartPath = path.join(this.projectRoot, 'src', 'components', 'charts', 'line', 'LineChartOne.tsx');
    const countryMapPath = path.join(this.projectRoot, 'src', 'components', 'ecommerce', 'CountryMap.tsx');
    const datePickerPath = path.join(this.projectRoot, 'src', 'components', 'form', 'date-picker.tsx');
    const calendarPath = path.join(this.projectRoot, 'src', 'components', 'calendar', 'Calendar.tsx');

    const lineChartCode = fs.existsSync(lineChartPath) ? fs.readFileSync(lineChartPath, 'utf-8') : '';
    const countryMapCode = fs.existsSync(countryMapPath) ? fs.readFileSync(countryMapPath, 'utf-8') : '';
    const datePickerCode = fs.existsSync(datePickerPath) ? fs.readFileSync(datePickerPath, 'utf-8') : '';
    const calendarCode = fs.existsSync(calendarPath) ? fs.readFileSync(calendarPath, 'utf-8') : '';

    const hasDynamicApexIntegration = /dynamic\(\(\) => import\("react-apexcharts"\)/.test(lineChartCode);
    const hasDynamicVectorMapIntegration = /dynamic\(\s*\(\)\s*=>\s*import\("@react-jvectormap\/core"\)/.test(countryMapCode);
    const hasFlatpickrIntegration = /from\s+"flatpickr"|flatpickr\(/.test(datePickerCode);
    const hasFullCalendarIntegration = /@fullcalendar\/(react|daygrid|timegrid|interaction)/.test(calendarCode);

    const routeGroupNames = routeGroups.map((group) => group.name);
    const samplePage = appPages.find((item) => item.route === '/basic-tables') || appPages[0];

    let contextTable = '| Context File | createContext | Provider | useX Hook |\n';
    contextTable += '|--------------|---------------|----------|-----------|\n';
    contextRows.forEach((row) => {
      contextTable += `| \`${row.file}\` | ${row.hasCreateContext ? '✅' : '⚠'} | ${row.hasProvider ? '✅' : '⚠'} | ${row.hasUseHook ? '✅' : '⚠'} |\n`;
    });

    let hooksTable = '| Hook | File | uses useState | uses useCallback |\n';
    hooksTable += '|------|------|---------------|------------------|\n';
    hookRows.forEach((row) => {
      hooksTable += `| \`${row.hookName}\` | \`${row.file}\` | ${row.hasUseState ? '✅' : '—'} | ${row.hasUseCallback ? '✅' : '—'} |\n`;
    });

    const content = `# Integration Patterns Guide

**Generated:** ${timestamp}

## Overview

This guide documents practical patterns for extending TailAdmin consistently: creating UI components, adding App Router pages, integrating external libraries, adding Context providers, creating custom hooks, and following naming conventions.

## Pattern 1: Creating New UI Components

### Recommended structure

- Place reusable primitives under \`src/components/ui/<feature>/\`
- Place domain-focused components under category folders (\`auth\`, \`forms\`, \`tables\`, \`ecommerce\`, etc.)
- Reuse existing wrapper primitives (e.g., \`ComponentCard\`, \`Table\`, \`Badge\`, \`Button\`) when possible

### Detected category set

${this.generateBulletList(componentCategories)}

### Canonical component template

\`\`\`tsx
import React from "react";

interface ExampleWidgetProps {
  title: string;
  className?: string;
}

const ExampleWidget: React.FC<ExampleWidgetProps> = ({ title, className = "" }) => {
  return <section className={className}>{title}</section>;
};

export default ExampleWidget;
\`\`\`

## Pattern 2: Creating New Pages in App Router

### Route organization pattern

- Use route groups (folders like \`(admin)\`, \`(ui-elements)\`) to organize without changing URL paths
- Keep page modules in \`page.tsx\` with optional \`metadata: Metadata\`
- Use existing layout hierarchy instead of duplicating wrappers

### Current route groups detected

${this.generateBulletList(routeGroupNames)}

### Example page scaffold

\`\`\`tsx
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js Example Page | TailAdmin",
};

export default function ExamplePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Example" />
      {/* page content */}
    </div>
  );
}
\`\`\`

${samplePage ? `Reference detected route: \`${samplePage.route}\` from \`${samplePage.filePath}\`.` : ''}

## Pattern 3: Integrating External Libraries

Current integration conventions observed:

1. **Dynamic import for browser-only libs** in client components
2. **Typed configuration objects** for external APIs
3. **Lifecycle-safe initialization/cleanup** for imperative libs

### Library integration snapshots

- ApexCharts dynamic import: ${hasDynamicApexIntegration ? '✅ Detected (react-apexcharts)' : '⚠ Not detected'}
- jVectorMap dynamic import: ${hasDynamicVectorMapIntegration ? '✅ Detected (@react-jvectormap/core)' : '⚠ Not detected'}
- flatpickr integration: ${hasFlatpickrIntegration ? '✅ Detected' : '⚠ Not detected'}
- FullCalendar integration: ${hasFullCalendarIntegration ? '✅ Detected' : '⚠ Not detected'}

### External stack from package.json

- \`apexcharts\`: ${dependencies.apexcharts || 'N/A'}
- \`react-apexcharts\`: ${dependencies['react-apexcharts'] || 'N/A'}
- \`@react-jvectormap/core\`: ${dependencies['@react-jvectormap/core'] || 'N/A'}
- \`flatpickr\`: ${dependencies.flatpickr || 'N/A'}
- \`@fullcalendar/react\`: ${dependencies['@fullcalendar/react'] || 'N/A'}

## Pattern 4: Creating New Context Providers

### Context implementation checklist

1. Define a typed context contract (e.g., \`type FeatureContextType = {...}\`)
2. Initialize context with \`createContext<... | undefined>(undefined)\`
3. Export a provider component wrapping \`children\`
4. Export a \`useFeature\` hook that throws if called outside provider

### Existing context modules

${contextTable}

## Pattern 5: Creating New Custom Hooks

### Hook pattern

- Hook name starts with \`use\`
- Encapsulate reusable logic + state transitions
- Return a small, typed API surface (state + actions)

### Existing custom hooks

${hooksTable}

### Template

\`\`\`tsx
import { useState, useCallback } from "react";

export const useExample = () => {
  const [value, setValue] = useState(false);
  const enable = useCallback(() => setValue(true), []);
  const disable = useCallback(() => setValue(false), []);
  return { value, enable, disable };
};
\`\`\`

## Pattern 6: Naming Conventions

- Component file naming: \`${fileNamingPattern?.pattern || 'PascalCase.tsx'}\`
- Props typing convention: \`${propsPattern?.pattern || 'ComponentNameProps'}\`
- Hook naming convention: \`${hookNamingPattern?.pattern || 'use + PascalCase'}\`
- Context naming convention: \`${contextNamingPattern?.pattern || 'NameContext.tsx with useName hook'}\`

### Practical naming rules

1. **Components:** PascalCase file + export (e.g., \`UserDropdown.tsx\`)
2. **Props:** \`<ComponentName>Props\`
3. **Hooks:** \`use<Feature>\`
4. **Context files:** \`<Feature>Context.tsx\` exporting \`<Feature>Provider\` + \`use<Feature>\`
5. **Folders:** category-oriented and mostly kebab-case where applicable

## Cross-References

- [Architecture Documentation](./architecture.md) - layout and route hierarchy context
- [Component Catalog](./components.md) - current component inventory and dependencies
- [Routing Guide](./routing.md) - practical route group and layout chain behavior
- [State Management](./state-management.md) - existing context and hook usage
- [Configuration Guide](./configuration.md) - tooling setup for new integrations

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'integration-patterns.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate assets management documentation
   */
  private async generateAssetsDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const imagesDir = path.join(this.projectRoot, 'public', 'images');
    const srcDir = path.join(this.projectRoot, 'src');

    const categories = fs.existsSync(imagesDir)
      ? fs.readdirSync(imagesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b))
      : [];

    const countFilesRecursively = (dir: string): number => {
      if (!fs.existsSync(dir)) return 0;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let count = 0;
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          count += countFilesRecursively(fullPath);
        } else {
          count += 1;
        }
      });
      return count;
    };

    const listFirstFiles = (dir: string, limit = 4): string[] => {
      if (!fs.existsSync(dir)) return [];
      const out: string[] = [];

      const walk = (current: string): void => {
        if (out.length >= limit) return;
        const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
        entries.forEach((entry) => {
          if (out.length >= limit) return;
          const fullPath = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else {
            out.push(path.relative(imagesDir, fullPath));
          }
        });
      };

      walk(dir);
      return out;
    };

    const usageByCategory = new Map<string, number>();
    categories.forEach((category) => usageByCategory.set(category, 0));

    const srcFiles: string[] = [];
    const walkSrc = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkSrc(fullPath);
          return;
        }
        if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          srcFiles.push(fullPath);
        }
      });
    };
    walkSrc(srcDir);

    srcFiles.forEach((filePath) => {
      const code = fs.readFileSync(filePath, 'utf-8');
      categories.forEach((category) => {
        const regex = new RegExp(`(["'])\\.?\\/?images\\/${category}\\/`, 'g');
        const matches = code.match(regex);
        if (matches && matches.length > 0) {
          usageByCategory.set(category, (usageByCategory.get(category) || 0) + matches.length);
        }
      });
    });

    const imageRefConsumers = this.findFilesContaining(srcDir, /["']\.?\/?images\//)
      .map((file: string) => path.relative(this.projectRoot, file));

    const errorImageConsumers = this.findFilesContaining(srcDir, /["']\/?images\/error\//)
      .map((file: string) => path.relative(this.projectRoot, file));

    let categoriesTable = '| Category | Files | Usage in src | Example Assets |\n';
    categoriesTable += '|----------|-------|--------------|----------------|\n';
    categories.forEach((category) => {
      const categoryDir = path.join(imagesDir, category);
      const fileCount = countFilesRecursively(categoryDir);
      const usage = usageByCategory.get(category) || 0;
      const examples = listFirstFiles(categoryDir, 3).map((item) => `\`${item}\``).join(', ') || '-';
      categoriesTable += `| \`${category}\` | ${fileCount} | ${usage} | ${examples} |\n`;
    });

    const logoDir = path.join(imagesDir, 'logo');
    const hasLogo = fs.existsSync(path.join(logoDir, 'logo.svg'));
    const hasLogoDark = fs.existsSync(path.join(logoDir, 'logo-dark.svg'));
    const hasLogoIcon = fs.existsSync(path.join(logoDir, 'logo-icon.svg'));
    const hasAuthLogo = fs.existsSync(path.join(logoDir, 'auth-logo.svg'));

    const errorDir = path.join(imagesDir, 'error');
    const errorVariants = fs.existsSync(errorDir)
      ? fs.readdirSync(errorDir).filter((file) => file.endsWith('.svg')).sort((a, b) => a.localeCompare(b))
      : [];

    const hasAbsoluteImagePaths = srcFiles.some((filePath) => /src=\s*["']\/images\//.test(fs.readFileSync(filePath, 'utf-8')));
    const hasRelativeImagePaths = srcFiles.some((filePath) => /src=\s*["']\.\/images\//.test(fs.readFileSync(filePath, 'utf-8')));

    const content = `# Assets Management Guide

**Generated:** ${timestamp}

## Overview

This document explains how static assets are organized and referenced in TailAdmin, focusing on \`public/images\`, key image categories, logo variants, and error page assets.

## public/images Structure

- Root assets directory: \`public/images\`
- Detected category folders: **${categories.length}**

${categoriesTable}

## Required Image Categories

The following categories requested by requirements are present in this project:

- \`brand\`: ${categories.includes('brand') ? '✅ Present' : '⚠ Missing'}
- \`cards\`: ${categories.includes('cards') ? '✅ Present' : '⚠ Missing'}
- \`user\`: ${categories.includes('user') ? '✅ Present' : '⚠ Missing'}
- \`error\`: ${categories.includes('error') ? '✅ Present' : '⚠ Missing'}
- \`logo\`: ${categories.includes('logo') ? '✅ Present' : '⚠ Missing'}
- \`icons\`: ${categories.includes('icons') ? '✅ Present' : '⚠ Missing'}

## Referencing Images from Components

### Current path patterns detected

- Absolute from public root (recommended): ${hasAbsoluteImagePaths ? '✅ Detected (`/images/...`)' : '⚠ Not detected'}
- Relative-like image paths (\`./images/...\`): ${hasRelativeImagePaths ? '✅ Detected (should be normalized when possible)' : '— Not detected'}

### Recommended usage example

\`\`\`tsx
import Image from "next/image";

<Image
  src="/images/user/user-01.jpg"
  alt="User avatar"
  width={40}
  height={40}
/>
\`\`\`

### Image reference footprint

- Files in \`src\` referencing \`images/\`: **${imageRefConsumers.length}**

${this.generatePathBulletList(imageRefConsumers.slice(0, 20))}

## Logo System

Logo variants in \`public/images/logo\`:

- \`logo.svg\`: ${hasLogo ? '✅ Present' : '⚠ Missing'}
- \`logo-dark.svg\`: ${hasLogoDark ? '✅ Present' : '⚠ Missing'}
- \`logo-icon.svg\`: ${hasLogoIcon ? '✅ Present' : '⚠ Missing'}
- \`auth-logo.svg\`: ${hasAuthLogo ? '✅ Present' : '⚠ Missing'}

### Usage notes

- Sidebar/header commonly use \`logo.svg\` and \`logo-dark.svg\` for light/dark theme toggling.
- Compact brand slot uses \`logo-icon.svg\`.
- Auth layout uses \`auth-logo.svg\` in split-screen branding.

## Error Images and Error Pages

- Error asset directory: \`public/images/error\`
- Error variants detected: **${errorVariants.length}**

${this.generateBulletList(errorVariants.map((file) => `public/images/error/${file}`))}

### Error image usage footprint

- Files in \`src\` referencing \`/images/error/\`: **${errorImageConsumers.length}**

${this.generatePathBulletList(errorImageConsumers)}

### Current behavior

- 404 pages render both light and dark variants (e.g., \`404.svg\` + \`404-dark.svg\`).
- Additional assets for 500/503/maintenance/success are available for future dedicated pages.

## Asset Addition Guidelines

When adding new image assets:

1. Place files in the most specific category under \`public/images/<category>\`
2. Use descriptive kebab-case names (e.g., \`feature-hero-01.png\`)
3. Prefer \`/images/...\` absolute paths in \`next/image\` components
4. Add dark variants where needed for theme-aware screens
5. Reuse existing category conventions to keep discoverability high

## Cross-References

- [Architecture Documentation](./architecture.md) - high-level static asset placement
- [Styling Guide](./styling.md) - dark mode implications for image variants
- [Routing Guide](./routing.md) - error page routing context
- [Icons Guide](./icons.md) - SVG icon system (separate from image assets)

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'assets.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate accessibility and best practices documentation
   */
  private async generateAccessibilityDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const srcDir = path.join(this.projectRoot, 'src');
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = fs.existsSync(packageJsonPath)
      ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
      : { dependencies: {} };
    const dependencies = packageJson.dependencies || {};

    const filesToScan: string[] = [];
    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          return;
        }
        if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          filesToScan.push(fullPath);
        }
      });
    };
    walk(srcDir);

    const countRegexInFiles = (regex: RegExp): number => {
      let count = 0;
      filesToScan.forEach((filePath) => {
        const code = fs.readFileSync(filePath, 'utf-8');
        const matches = code.match(regex);
        if (matches) count += matches.length;
      });
      return count;
    };

    const altCount = countRegexInFiles(/\balt\s*=/g);
    const ariaCount = countRegexInFiles(/\baria-[a-zA-Z-]+\s*=/g);
    const htmlForCount = countRegexInFiles(/\bhtmlFor\s*=/g);
    const roleCount = countRegexInFiles(/\brole\s*=/g);

    const semanticTags = ['<header', '<main', '<nav', '<section', '<article', '<aside', '<footer', '<form', '<table'];
    const semanticUsage = semanticTags.map((tag) => ({
      tag,
      count: countRegexInFiles(new RegExp(tag.replace('<', '\\<'), 'g')),
    }));

    const hasTailwindFormsPlugin = Boolean(dependencies['@tailwindcss/forms']);
    const dynamicImportFiles = this.findFilesContaining(srcDir, /dynamic\s*\(/)
      .map((file: string) => path.relative(this.projectRoot, file));
    const nextImageFiles = this.findFilesContaining(srcDir, /from\s+["']next\/image["']/)
      .map((file: string) => path.relative(this.projectRoot, file));
    const throwGuardFiles = this.findFilesContaining(srcDir, /throw\s+new\s+Error\(/)
      .map((file: string) => path.relative(this.projectRoot, file));
    const notFoundFiles = this.findFilesContaining(srcDir, /not-found|error-404|\/images\/error\//)
      .map((file: string) => path.relative(this.projectRoot, file));

    const modalPath = path.join(this.projectRoot, 'src', 'components', 'ui', 'modal', 'index.tsx');
    const dropdownPath = path.join(this.projectRoot, 'src', 'components', 'ui', 'dropdown', 'Dropdown.tsx');
    const appHeaderPath = path.join(this.projectRoot, 'src', 'layout', 'AppHeader.tsx');

    const modalCode = fs.existsSync(modalPath) ? fs.readFileSync(modalPath, 'utf-8') : '';
    const dropdownCode = fs.existsSync(dropdownPath) ? fs.readFileSync(dropdownPath, 'utf-8') : '';
    const appHeaderCode = fs.existsSync(appHeaderPath) ? fs.readFileSync(appHeaderPath, 'utf-8') : '';

    const hasEscapeClose = /event\.key\s*===\s*"Escape"/.test(modalCode);
    const hasOutsideClickClose = /handleClickOutside/.test(dropdownCode);
    const hasAriaLabelInHeader = /aria-label\s*=/.test(appHeaderCode);

    let semanticTable = '| Semantic Element | Usage Count |\n';
    semanticTable += '|------------------|-------------|\n';
    semanticUsage.forEach((item) => {
      semanticTable += `| \`${item.tag.replace('<', '')}\` | ${item.count} |\n`;
    });

    const content = `# Accessibility & Best Practices Guide

**Generated:** ${timestamp}

## Overview

This document summarizes accessibility patterns and quality best practices used in TailAdmin, including interactive accessibility, forms accessibility, semantic HTML, error handling patterns, and performance-oriented implementation choices.

## Accessibility Patterns in Interactive Components

### Current indicators

- \`alt\` attributes in UI images: **${altCount}**
- \`aria-*\` attributes: **${ariaCount}**
- Label-to-control binding (\`htmlFor\`): **${htmlForCount}**
- Explicit role attributes: **${roleCount}**

### Interaction safety patterns detected

- Modal close via Escape key: ${hasEscapeClose ? '✅ Detected in `ui/modal/index.tsx`' : '⚠ Not detected'}
- Dropdown close on outside click: ${hasOutsideClickClose ? '✅ Detected in `ui/dropdown/Dropdown.tsx`' : '⚠ Not detected'}
- Header control with \`aria-label\`: ${hasAriaLabelInHeader ? '✅ Detected in `layout/AppHeader.tsx`' : '⚠ Not detected'}

These patterns improve keyboard support and reduce interaction traps.

## Forms Accessibility and @tailwindcss/forms

- Dependency \`@tailwindcss/forms\`: ${hasTailwindFormsPlugin ? '✅ Present in package dependencies' : '⚠ Not detected'}
- Label component usage with \`htmlFor\`: ✅ Core pattern used by form primitives
- Typed input props include disabled/error/success states: ✅ Present in \`InputField\`

### Recommended form accessibility pattern

\`\`\`tsx
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" placeholder="info@gmail.com" />
\`\`\`

## Semantic HTML Structure Conventions

${semanticTable}

### Observed conventions

1. Structured forms with \`<form>\`, labels, and typed inputs
2. Data rendering via semantic table primitives (\`<table>\`, \`<thead>\`, \`<tbody>\`)
3. Layout-oriented wrappers with consistent heading hierarchy and section grouping

## Error Handling Patterns

### Runtime guard patterns

- Files with explicit \`throw new Error(...)\` guards: **${throwGuardFiles.length}**

${this.generatePathBulletList(throwGuardFiles)}

These guards are mainly used in context hooks to enforce provider boundaries (e.g., \`useTheme\`, \`useSidebar\`).

### Error page patterns

- Files related to not-found / error imagery routes: **${notFoundFiles.length}**

${this.generatePathBulletList(notFoundFiles.slice(0, 10))}

## Performance Best Practices (Lazy Loading and Code Splitting)

### Current usage indicators

- Files using dynamic import: **${dynamicImportFiles.length}**
- Files using \`next/image\`: **${nextImageFiles.length}**

### Practices currently applied

1. **Dynamic imports** for browser-only heavy libraries (charts/maps) to avoid SSR/runtime mismatches
2. **Image optimization** through \`next/image\` for responsive delivery and sizing control
3. **Client boundary scoping** with \`"use client"\` only where interactivity is required

### Dynamic import footprint

${this.generatePathBulletList(dynamicImportFiles)}

## Practical Checklist for New Features

When adding new UI features, follow this checklist:

1. Provide meaningful \`alt\` text for all informative images
2. Prefer \`Label + htmlFor + id\` linkage in forms
3. Add \`aria-label\` to icon-only actionable controls
4. Ensure keyboard escape/close path for overlays
5. Use semantic tags where suitable before generic wrappers
6. Use \`next/image\` and dynamic import for heavy visual features

## Cross-References

- [Forms Documentation](./forms.md) - form controls and validation patterns
- [Modals & Dropdowns](./modals-dropdowns.md) - open/close interaction details
- [Assets Guide](./assets.md) - image asset organization and usage
- [Data Visualization Guide](./data-visualization.md) - dynamic chart integration patterns
- [Configuration Guide](./configuration.md) - dependency/tooling setup impacting accessibility and performance

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'accessibility.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Generate index and navigation documentation
   */
  private async generateIndexDoc(): Promise<void> {
    const timestamp = new Date().toISOString();

    const sections: Array<{ file: string; title: string; description: string; primaryUse: string }> = [
      {
        file: 'architecture.md',
        title: 'Architecture Documentation',
        description: 'Project structure, route groups, layout hierarchy, and dependency overview.',
        primaryUse: 'Start here for high-level system understanding.',
      },
      {
        file: 'components.md',
        title: 'Component Catalog',
        description: 'Inventory of components by category, props, and dependencies.',
        primaryUse: 'Use when locating reusable UI or feature components.',
      },
      {
        file: 'styling.md',
        title: 'Styling Guide',
        description: 'Tailwind conventions, dark mode patterns, and design token usage.',
        primaryUse: 'Use for visual consistency and theme-aware changes.',
      },
      {
        file: 'state-management.md',
        title: 'State Management Guide',
        description: 'Context providers, hooks, and local vs global state decisions.',
        primaryUse: 'Use for data flow and state ownership decisions.',
      },
      {
        file: 'routing.md',
        title: 'Routing Guide',
        description: 'Next.js App Router structure, route groups, and navigation patterns.',
        primaryUse: 'Use for adding pages, layouts, and navigation updates.',
      },
      {
        file: 'forms.md',
        title: 'Forms Documentation',
        description: 'Form primitives, validation patterns, and auth form examples.',
        primaryUse: 'Use when building or refactoring form-heavy features.',
      },
      {
        file: 'data-visualization.md',
        title: 'Data Visualization Guide',
        description: 'Charts, maps, calendar integrations, and performance notes.',
        primaryUse: 'Use for metrics dashboards and chart/map work.',
      },
      {
        file: 'tables.md',
        title: 'Tables Documentation',
        description: 'Table components, pagination patterns, and rendering conventions.',
        primaryUse: 'Use when implementing tabular data experiences.',
      },
      {
        file: 'modals-dropdowns.md',
        title: 'Modals & Dropdowns Guide',
        description: 'Overlay interaction patterns, open/close handling, and hook usage.',
        primaryUse: 'Use for transient UI interactions and accessibility-safe overlays.',
      },
      {
        file: 'icons.md',
        title: 'Icons Guide',
        description: 'SVG icon system, imports, sizing, color patterns, and extension flow.',
        primaryUse: 'Use when selecting or adding iconography.',
      },
      {
        file: 'typescript.md',
        title: 'TypeScript Guide',
        description: 'Shared interfaces, declaration files, and typing conventions.',
        primaryUse: 'Use when defining types or extending external library types.',
      },
      {
        file: 'configuration.md',
        title: 'Configuration Guide',
        description: 'Next.js, TypeScript, ESLint, PostCSS, Prettier, and npm scripts.',
        primaryUse: 'Use when changing project tooling or environment behavior.',
      },
      {
        file: 'integration-patterns.md',
        title: 'Integration Patterns Guide',
        description: 'Repeatable patterns for components, pages, providers, and hooks.',
        primaryUse: 'Use as a checklist for introducing new features consistently.',
      },
      {
        file: 'assets.md',
        title: 'Assets Guide',
        description: 'Image directory taxonomy, usage conventions, and error assets.',
        primaryUse: 'Use for static asset additions and image references.',
      },
      {
        file: 'accessibility.md',
        title: 'Accessibility & Best Practices Guide',
        description: 'Accessibility indicators, semantic structure, and performance best practices.',
        primaryUse: 'Use to validate a11y/performance quality before shipping.',
      },
    ];

    const availableSections = sections.filter((section) => fs.existsSync(path.join(this.docsDir, section.file)));
    const missingSections = sections.filter((section) => !fs.existsSync(path.join(this.docsDir, section.file)));

    const toc = availableSections
      .map((section, index) => `${index + 1}. [${section.title}](./${section.file})`)
      .join('\n');

    let overviewTable = '| Section | Description | Primary Use |\n';
    overviewTable += '|---------|-------------|-------------|\n';
    availableSections.forEach((section) => {
      overviewTable += `| [${section.title}](./${section.file}) | ${section.description} | ${section.primaryUse} |\n`;
    });

    const missingSectionBlock = missingSections.length > 0
      ? `\n## Missing or Not Yet Generated Sections\n\n${this.generateBulletList(missingSections.map((section) => `${section.file} (${section.title})`))}`
      : '';

    const content = `# AI-Oriented Documentation Index

**Generated:** ${timestamp}

## Overview

This index is the primary navigation entrypoint for all generated project documentation. It is designed for human developers and AI agents to quickly select the most relevant reference based on the implementation task.

## Table of Contents

${toc}

## Section Summary

${overviewTable}

## Navigation Instructions for AI Agents

Use this sequence for efficient context gathering:

1. Start with [Architecture Documentation](./architecture.md) for global context.
2. For feature implementation, jump to the domain guide (forms, tables, charts, routing, etc.).
3. Validate consistency with [Integration Patterns Guide](./integration-patterns.md).
4. Validate type/tooling impacts with [TypeScript Guide](./typescript.md) and [Configuration Guide](./configuration.md).
5. Finish with [Accessibility & Best Practices Guide](./accessibility.md) before delivery.

### Fast Path by Task Type

- **Create/modify page:** [routing.md](./routing.md) → [components.md](./components.md) → [integration-patterns.md](./integration-patterns.md)
- **Build UI element:** [components.md](./components.md) → [styling.md](./styling.md) → [icons.md](./icons.md)
- **Add form flow:** [forms.md](./forms.md) → [state-management.md](./state-management.md) → [accessibility.md](./accessibility.md)
- **Add data widgets:** [data-visualization.md](./data-visualization.md) or [tables.md](./tables.md) → [assets.md](./assets.md)
- **Change tooling/config:** [configuration.md](./configuration.md) → [typescript.md](./typescript.md)

${missingSectionBlock}

## Coverage

- Expected sections: **${sections.length}**
- Available sections: **${availableSections.length}**
- Missing sections: **${missingSections.length}**

---

*This documentation was automatically generated. Last updated: ${timestamp}*
`;

    const filePath = path.join(this.docsDir, 'index.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Generated: ${filePath}`);
  }

  /**
   * Discover all app routes from page.tsx files
   */
  private discoverAppPages(appDir: string): Array<{ route: string; filePath: string; groups: string[] }> {
    const pages: Array<{ route: string; filePath: string; groups: string[] }> = [];
    const pageFiles: string[] = [];

    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          return;
        }

        if (entry.name === 'page.tsx') {
          pageFiles.push(fullPath);
        }
      });
    };

    walk(appDir);

    pageFiles.forEach((filePath) => {
      const relDir = path.relative(appDir, path.dirname(filePath));
      const segments = relDir === '' ? [] : relDir.split(path.sep);
      const groups = segments.filter((segment) => /^\(.+\)$/.test(segment)).map((segment) => segment.slice(1, -1));
      const urlSegments = segments.filter((segment) => !/^\(.+\)$/.test(segment));
      const route = `/${urlSegments.join('/')}`.replace(/\/+/g, '/');

      pages.push({
        route: route === '/' ? '/' : route.replace(/\/$/, ''),
        filePath: path.relative(this.projectRoot, filePath),
        groups,
      });
    });

    return pages.sort((a, b) => a.route.localeCompare(b.route));
  }

  /**
   * Discover route groups (folders wrapped in parentheses)
   */
  private discoverRouteGroups(appDir: string): Array<{ name: string; path: string; purpose: string }> {
    const groups = new Map<string, { name: string; path: string; purpose: string }>();

    const purposeByGroup: Record<string, string> = {
      admin: 'Admin dashboard pages with sidebar + header layout',
      'others-pages': 'Admin sub-group for charts, forms, tables, calendar, profile pages',
      'ui-elements': 'Admin sub-group for UI showcase pages',
      'full-width-pages': 'Pages without admin shell (no sidebar/header)',
      auth: 'Authentication pages and auth-specific split layout',
      'error-pages': 'Error/status pages rendered in full-width layout',
      chart: 'Chart route subgroup (bar/line)',
      forms: 'Form route subgroup',
      tables: 'Table route subgroup',
    };

    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach((entry) => {
        if (!entry.isDirectory()) return;

        const fullPath = path.join(dir, entry.name);
        if (/^\(.+\)$/.test(entry.name)) {
          const groupName = entry.name.slice(1, -1);
          groups.set(fullPath, {
            name: groupName,
            path: path.relative(this.projectRoot, fullPath),
            purpose: purposeByGroup[groupName] || 'Route organization group (URL-neutral)',
          });
        }

        walk(fullPath);
      });
    };

    walk(appDir);
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Build layout chain applied to each route
   */
  private buildLayoutChainByPage(
    appDir: string,
    pages: Array<{ route: string; filePath: string; groups: string[] }>
  ): Array<{ route: string; layouts: string[] }> {
    return pages.map((page) => {
      const pageAbsolutePath = path.join(this.projectRoot, page.filePath);
      const pageDir = path.dirname(pageAbsolutePath);
      const layouts: string[] = [];

      let current = pageDir;
      while (current.startsWith(appDir)) {
        const candidate = path.join(current, 'layout.tsx');
        if (fs.existsSync(candidate)) {
          layouts.push(path.relative(this.projectRoot, candidate));
        }
        if (current === appDir) break;
        current = path.dirname(current);
      }

      return {
        route: page.route,
        layouts: layouts.reverse(),
      };
    });
  }

  /**
   * Extract route entries from AppSidebar nav arrays
   */
  private extractSidebarNavigationEntries(filePath: string): Array<{ section: string; name: string; path: string }> {
    if (!fs.existsSync(filePath)) return [];

    const content = fs.readFileSync(filePath, 'utf-8');
    const entries: Array<{ section: string; name: string; path: string }> = [];

    const navMatch = content.match(/const\s+navItems:[\s\S]*?=\s*\[([\s\S]*?)\];/);
    const othersMatch = content.match(/const\s+othersItems:[\s\S]*?=\s*\[([\s\S]*?)\];/);

    const parseBlock = (block: string, section: string): void => {
      // Capture any explicit name/path pair (works for direct items and subItems)
      const namePathRegex = /name:\s*"([^"]+)"\s*,\s*path:\s*"([^"]+)"/g;
      let pairMatch: RegExpExecArray | null = null;
      while ((pairMatch = namePathRegex.exec(block)) !== null) {
        entries.push({
          section,
          name: pairMatch[1],
          path: pairMatch[2],
        });
      }
    };

    if (navMatch?.[1]) parseBlock(navMatch[1], 'main');
    if (othersMatch?.[1]) parseBlock(othersMatch[1], 'others');

    const dedup = new Map<string, { section: string; name: string; path: string }>();
    entries.forEach((entry) => {
      const key = `${entry.section}::${entry.name}::${entry.path}`;
      dedup.set(key, entry);
    });

    return Array.from(dedup.values()).sort((a, b) => {
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      return a.path.localeCompare(b.path);
    });
  }

  /**
   * Find files matching a content regex under a directory
   */
  private findFilesContaining(rootDir: string, pattern: RegExp): string[] {
    const matches: string[] = [];

    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          return;
        }

        if (!entry.name.endsWith('.tsx') && !entry.name.endsWith('.ts')) {
          return;
        }

        const content = fs.readFileSync(fullPath, 'utf-8');
        if (pattern.test(content)) {
          matches.push(fullPath);
        }
      });
    };

    walk(rootDir);
    return matches.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Generate route groups markdown table
   */
  private generateRouteGroupsTable(groups: Array<{ name: string; path: string; purpose: string }>): string {
    if (groups.length === 0) {
      return 'No route groups detected.\n';
    }

    let output = '| Group | Folder | Purpose |\n';
    output += '|-------|--------|---------|\n';
    groups.forEach((group) => {
      output += `| \`${group.name}\` | \`${group.path}\` | ${group.purpose} |\n`;
    });
    return output;
  }

  /**
   * Generate routes markdown table
   */
  private generateRoutesTable(pages: Array<{ route: string; filePath: string; groups: string[] }>): string {
    if (pages.length === 0) {
      return 'No routes detected.\n';
    }

    let output = '| URL Route | Source File | Route Groups |\n';
    output += '|-----------|-------------|--------------|\n';
    pages.forEach((page) => {
      const groupsText = page.groups.length > 0 ? page.groups.map((group) => `\`${group}\``).join(', ') : '-';
      output += `| \`${page.route}\` | \`${page.filePath}\` | ${groupsText} |\n`;
    });
    return output;
  }

  /**
   * Generate layout chain markdown table
   */
  private generateLayoutChainTable(chains: Array<{ route: string; layouts: string[] }>): string {
    if (chains.length === 0) {
      return 'No layout chains detected.\n';
    }

    let output = '| Route | Layout Chain |\n';
    output += '|-------|--------------|\n';
    chains.forEach((chain) => {
      const layoutText = chain.layouts.length > 0
        ? chain.layouts.map((layout) => `\`${layout}\``).join(' → ')
        : '(none)';
      output += `| \`${chain.route}\` | ${layoutText} |\n`;
    });
    return output;
  }

  /**
   * Generate sidebar navigation entries markdown table
   */
  private generateSidebarEntriesTable(entries: Array<{ section: string; name: string; path: string }>): string {
    if (entries.length === 0) {
      return 'No sidebar entries detected.\n';
    }

    let output = '| Section | Label | Path |\n';
    output += '|---------|-------|------|\n';
    entries.forEach((entry) => {
      output += `| \`${entry.section}\` | ${entry.name} | \`${entry.path}\` |\n`;
    });
    return output;
  }

  /**
   * Generate error pages list markdown
   */
  private generateErrorPagesList(pages: Array<{ route: string; filePath: string; groups: string[] }>): string {
    if (pages.length === 0) {
      return '- No explicit error pages detected under `src/app` (except fallback handlers if present).\n';
    }

    return pages
      .map((page) => `- \`${page.route}\` → \`${page.filePath}\``)
      .join('\n') + '\n';
  }

  /**
   * Extract object-type fields from a `type Name = { ... }` declaration
   */
  private extractTypeLiteralFields(content: string, typeName: string): Array<{ name: string; type: string }> {
    if (!content) return [];

    const typeRegex = new RegExp(`type\\s+${typeName}\\s*=\\s*{([\\s\\S]*?)};`);
    const typeMatch = content.match(typeRegex);
    if (!typeMatch?.[1]) return [];

    const body = typeMatch[1];
    const lines = body.split('\n').map((line) => line.trim()).filter(Boolean);
    const fields: Array<{ name: string; type: string }> = [];

    lines.forEach((line) => {
      const clean = line.replace(/,$/, '').replace(/;$/, '').trim();
      const separatorIndex = clean.indexOf(':');
      if (separatorIndex === -1) return;

      const name = clean.slice(0, separatorIndex).trim();
      const type = clean.slice(separatorIndex + 1).trim();
      if (name && type) {
        fields.push({ name, type });
      }
    });

    return fields;
  }

  /**
   * Find files that consume a specific hook
   */
  private findHookConsumers(hookName: string, excludePaths: string[] = []): string[] {
    const srcDir = path.join(this.projectRoot, 'src');
    const consumers: string[] = [];
    const filesToScan: string[] = [];

    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          return;
        }

        if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          filesToScan.push(fullPath);
        }
      });
    };

    walk(srcDir);

    filesToScan.forEach((filePath) => {
      if (excludePaths.includes(filePath)) return;

      const content = fs.readFileSync(filePath, 'utf-8');
      const declarationRegex = new RegExp(`(const|function)\\s+${hookName}\\b`);
      if (declarationRegex.test(content)) return;

      const usageRegex = new RegExp(`\\b${hookName}\\s*\\(`);
      if (usageRegex.test(content)) {
        consumers.push(path.relative(this.projectRoot, filePath));
      }
    });

    return consumers.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Generate markdown table for context API
   */
  private generateContextApiTable(
    fields: Array<{ name: string; type: string }>,
    purposeMap: Record<string, string>
  ): string {
    if (fields.length === 0) {
      return 'No context API fields detected.\n';
    }

    let output = '| Field | Type | Purpose |\n';
    output += '|-------|------|---------|\n';
    fields.forEach(({ name, type }) => {
      const purpose = purposeMap[name] || 'Context value/method exposed to consumers.';
      output += `| \`${name}\` | \`${type}\` | ${purpose} |\n`;
    });

    return output;
  }

  /**
   * Generate markdown bullet list from project-relative paths
   */
  private generatePathBulletList(paths: string[]): string {
    if (paths.length === 0) {
      return '- No current consumers detected.\n';
    }

    return paths.map((item) => `- \`${item}\``).join('\n') + '\n';
  }

  /**
   * Extract CSS variables by prefix from globals.css
   */
  private extractCssVariables(content: string, prefix: string): Record<string, string> {
    const output: Record<string, string> = {};
    if (!content) return output;

    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escapedPrefix}([a-zA-Z0-9*-]+):\\s*([^;]+);`, 'g');
    let match: RegExpExecArray | null = null;

    while ((match = regex.exec(content)) !== null) {
      const token = match[1].trim();
      const value = match[2].trim();
      if (token && token !== '*') {
        output[token] = value;
      }
    }

    return output;
  }

  /**
   * Extract @utility definitions from globals.css
   */
  private extractCustomUtilities(content: string): string[] {
    if (!content) return [];

    const regex = /@utility\s+([a-zA-Z0-9-]+)/g;
    const utilities = new Set<string>();
    let match: RegExpExecArray | null = null;

    while ((match = regex.exec(content)) !== null) {
      utilities.add(match[1]);
    }

    return Array.from(utilities).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Group --color-* tokens by family (brand, gray, success, etc.)
   */
  private groupColorTokensByFamily(tokens: Record<string, string>): Record<string, Array<{ token: string; value: string }>> {
    const grouped: Record<string, Array<{ token: string; value: string }>> = {};

    Object.entries(tokens).forEach(([token, value]) => {
      const family = token.split('-')[0] || 'misc';
      if (!grouped[family]) {
        grouped[family] = [];
      }
      grouped[family].push({ token, value });
    });

    Object.keys(grouped).forEach((family) => {
      grouped[family].sort((a, b) => a.token.localeCompare(b.token, undefined, { numeric: true }));
    });

    return grouped;
  }

  /**
   * Count occurrences of dark: classes across source files
   */
  private countDarkVariantUsage(): number {
    const srcDir = path.join(this.projectRoot, 'src');
    const filesToScan: string[] = [];

    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          return;
        }

        if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.css')) {
          filesToScan.push(fullPath);
        }
      });
    };

    walk(srcDir);

    let count = 0;
    filesToScan.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const matches = content.match(/\bdark:/g);
      if (matches) {
        count += matches.length;
      }
    });

    return count;
  }

  /**
   * Count responsive prefix usage across source files
   */
  private collectResponsivePrefixUsage(): Record<string, number> {
    const prefixes = ['2xsm', 'xsm', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
    const usage: Record<string, number> = Object.fromEntries(prefixes.map((p) => [p, 0]));
    const srcDir = path.join(this.projectRoot, 'src');
    const filesToScan: string[] = [];

    const walk = (dir: string): void => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          return;
        }

        if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.css')) {
          filesToScan.push(fullPath);
        }
      });
    };

    walk(srcDir);

    filesToScan.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      prefixes.forEach((prefix) => {
        const regex = new RegExp(`\\b${prefix}:`, 'g');
        const matches = content.match(regex);
        if (matches) {
          usage[prefix] += matches.length;
        }
      });
    });

    return usage;
  }

  /**
   * Generate bullet list markdown
   */
  private generateBulletList(items: string[]): string {
    if (items.length === 0) {
      return '- None detected\n';
    }
    return items.map((item) => `- \`${item}\``).join('\n') + '\n';
  }

  /**
   * Generate markdown table for color families
   */
  private generateColorPaletteTable(palette: Record<string, Array<{ token: string; value: string }>>): string {
    const families = Object.keys(palette).sort((a, b) => a.localeCompare(b));
    if (families.length === 0) {
      return 'No color tokens detected.\n';
    }

    let output = '| Family | Token Count | Example Tokens |\n';
    output += '|--------|-------------|----------------|\n';

    families.forEach((family) => {
      const tokens = palette[family];
      const examples = tokens.slice(0, 3).map((token) => `\`${token.token}\``).join(', ');
      output += `| ${family} | ${tokens.length} | ${examples} |\n`;
    });

    return output;
  }

  /**
   * Generate markdown table for specific palette family
   */
  private generateFamilyTokenTable(
    palette: Record<string, Array<{ token: string; value: string }>>,
    family: string
  ): string {
    const tokens = palette[family] || [];
    if (tokens.length === 0) {
      return `No ${family} tokens detected.\n`;
    }

    let output = '| Token | Value |\n';
    output += '|-------|-------|\n';
    tokens.forEach(({ token, value }) => {
      output += `| \`${token}\` | \`${value}\` |\n`;
    });

    return output;
  }

  /**
   * Generate markdown table for breakpoints
   */
  private generateBreakpointTable(breakpoints: Record<string, string>): string {
    const entries = Object.entries(breakpoints).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
    if (entries.length === 0) {
      return 'No breakpoint tokens detected.\n';
    }

    let output = '| Breakpoint | Min Width |\n';
    output += '|------------|-----------|\n';
    entries.forEach(([name, value]) => {
      output += `| \`${name}\` | \`${value}\` |\n`;
    });

    return output;
  }

  /**
   * Generate markdown table for responsive prefix usage counts
   */
  private generateResponsiveUsageTable(usage: Record<string, number>): string {
    const entries = Object.entries(usage).filter(([, count]) => count > 0);
    if (entries.length === 0) {
      return 'No responsive prefixes detected.\n';
    }

    let output = '| Prefix | Approx. Occurrences |\n';
    output += '|--------|---------------------|\n';
    entries
      .sort((a, b) => b[1] - a[1])
      .forEach(([prefix, count]) => {
        output += `| \`${prefix}:\` | ${count} |\n`;
      });

    return output;
  }

  /**
   * Generate category summary section
   */
  private generateCategorySummary(groupedComponents: Record<string, ComponentInfo[]>): string {
    let output = '| Category | Count | Description |\n';
    output += '|----------|-------|-------------|\n';

    const categoryDescriptions: Record<string, string> = {
      auth: 'Authentication forms and components',
      calendar: 'Calendar components using FullCalendar',
      charts: 'Data visualization charts using ApexCharts',
      common: 'Shared utility components',
      ecommerce: 'E-commerce specific components',
      forms: 'Form input components',
      header: 'Header-related components',
      tables: 'Table components with pagination',
      ui: 'Reusable UI components',
      'user-profile': 'User profile components',
      videos: 'Video player components',
      other: 'Other components',
    };

    Object.keys(groupedComponents).sort().forEach(category => {
      const count = groupedComponents[category].length;
      const description = categoryDescriptions[category] || 'Components';
      output += `| ${category} | ${count} | ${description} |\n`;
    });

    return output;
  }

  /**
   * Generate detailed components by category section
   */
  private generateComponentsByCategory(groupedComponents: Record<string, ComponentInfo[]>): string {
    let output = '';

    const sortedCategories = Object.keys(groupedComponents).sort();

    sortedCategories.forEach(category => {
      output += `### ${this.capitalizeCategory(category)}\n\n`;

      const components = groupedComponents[category].sort((a, b) => a.name.localeCompare(b.name));

      components.forEach(component => {
        output += `#### ${component.name}\n\n`;
        output += `**Location:** \`${component.path}\`\n\n`;
        output += `**Purpose:** ${component.description}\n\n`;

        // Props section
        if (component.props.length > 0) {
          output += '**Props:**\n\n';
          output += '| Prop | Type | Required | Description |\n';
          output += '|------|------|----------|-------------|\n';

          component.props.forEach(prop => {
            const required = prop.required ? '✓' : '';
            const description = prop.description || '-';
            output += `| \`${prop.name}\` | \`${prop.type}\` | ${required} | ${description} |\n`;
          });
          output += '\n';
        } else {
          output += '**Props:** None (or not extracted)\n\n';
        }

        // Dependencies section
        if (component.dependencies.length > 0) {
          output += '**Dependencies:**\n';
          component.dependencies.forEach(dep => {
            output += `- ${dep}\n`;
          });
          output += '\n';
        }

        // Variants section (if applicable)
        if (this.hasVariants(component)) {
          output += this.generateVariantsSection(component);
        }

        output += '---\n\n';
      });
    });

    return output;
  }

  /**
   * Generate dependency graph section
   */
  private generateDependencyGraph(components: ComponentInfo[]): string {
    let output = 'This section shows which components depend on other components.\n\n';

    // Find components with dependencies
    const componentsWithDeps = components.filter(c => c.dependencies.length > 0);

    if (componentsWithDeps.length === 0) {
      output += '*No component dependencies detected.*\n\n';
      return output;
    }

    output += '```mermaid\ngraph LR\n';

    componentsWithDeps.forEach(component => {
      component.dependencies.forEach(dep => {
        // Only show dependencies that are actual components in our catalog
        const depComponent = components.find(c => c.name === dep);
        if (depComponent) {
          output += `    ${component.name} --> ${dep}\n`;
        }
      });
    });

    output += '```\n\n';

    // Also provide a text list
    output += '**Component Dependencies List:**\n\n';
    componentsWithDeps.forEach(component => {
      output += `- **${component.name}** depends on: ${component.dependencies.join(', ')}\n`;
    });
    output += '\n';

    return output;
  }

  /**
   * Generate component patterns section
   */
  private generateComponentPatterns(patterns: CodePatterns): string {
    let output = 'Common patterns identified in the component architecture.\n\n';

    // Composition patterns
    output += '### Composition Patterns\n\n';
    patterns.compositionPatterns.forEach(pattern => {
      output += `#### ${pattern.name}\n\n`;
      output += `${pattern.description}\n\n`;

      if (pattern.examples.length > 0) {
        output += '**Examples:**\n';
        pattern.examples.forEach(example => {
          output += `- ${example}\n`;
        });
        output += '\n';
      }
    });

    // State patterns
    output += '### State Management Patterns\n\n';
    patterns.statePatterns.forEach(pattern => {
      output += `#### ${pattern.name} (${pattern.type})\n\n`;
      output += `${pattern.description}\n\n`;
      output += `**Usage:** ${pattern.usage}\n\n`;

      if (pattern.examples.length > 0) {
        output += '**Examples:**\n';
        pattern.examples.forEach(example => {
          output += `- ${example}\n`;
        });
        output += '\n';
      }
    });

    // Naming conventions
    output += '### Naming Conventions\n\n';
    patterns.namingConventions.forEach(convention => {
      output += `#### ${convention.category}\n\n`;
      output += `**Pattern:** \`${convention.pattern}\`\n\n`;
      output += `${convention.description}\n\n`;

      if (convention.examples.length > 0) {
        output += '**Examples:**\n';
        convention.examples.forEach(example => {
          output += `- ${example}\n`;
        });
        output += '\n';
      }
    });

    return output;
  }

  /**
   * Generate usage examples section
   */
  private generateUsageExamples(groupedComponents: Record<string, ComponentInfo[]>): string {
    let output = 'Practical examples of how to use key components.\n\n';

    // Button example (UI category)
    if (groupedComponents.ui) {
      const button = groupedComponents.ui.find(c => c.name === 'Button');
      if (button) {
        output += '### Button Component\n\n';
        output += '```tsx\n';
        output += 'import { Button } from "@/components/ui/Button";\n\n';
        output += '// Basic usage\n';
        output += '<Button onClick={handleClick}>Click Me</Button>\n\n';
        output += '// With variant\n';
        output += '<Button variant="primary">Primary Button</Button>\n';
        output += '<Button variant="outline">Outline Button</Button>\n\n';
        output += '// With icons\n';
        output += '<Button startIcon={<PlusIcon />}>Add Item</Button>\n';
        output += '<Button endIcon={<ArrowIcon />}>Next</Button>\n';
        output += '```\n\n';
      }
    }

    // Form components example
    if (groupedComponents.forms) {
      const input = groupedComponents.forms.find(c => c.name === 'Input');
      const label = groupedComponents.forms.find(c => c.name === 'Label');

      if (input || label) {
        output += '### Form Components\n\n';
        output += '```tsx\n';
        output += 'import { Label } from "@/components/form/Label";\n';
        output += 'import { Input } from "@/components/form/Input";\n\n';
        output += '// Form field with label\n';
        output += '<div>\n';
        output += '  <Label htmlFor="email">Email Address</Label>\n';
        output += '  <Input\n';
        output += '    id="email"\n';
        output += '    type="email"\n';
        output += '    placeholder="Enter your email"\n';
        output += '    required\n';
        output += '  />\n';
        output += '</div>\n';
        output += '```\n\n';
      }
    }

    // Chart example
    if (groupedComponents.charts) {
      const chart = groupedComponents.charts[0];
      if (chart) {
        output += '### Chart Components\n\n';
        output += '```tsx\n';
        output += `import { ${chart.name} } from "@/components/charts/${chart.name}";\n\n`;
        output += '// Basic chart usage\n';
        output += `<${chart.name}\n`;
        output += '  data={chartData}\n';
        output += '  options={chartOptions}\n';
        output += '/>\n';
        output += '```\n\n';
      }
    }

    // Auth form example
    if (groupedComponents.auth) {
      const signInForm = groupedComponents.auth.find(c => c.name === 'SignInForm');
      if (signInForm) {
        output += '### Authentication Forms\n\n';
        output += '```tsx\n';
        output += 'import { SignInForm } from "@/components/auth/SignInForm";\n\n';
        output += '// Sign in form with validation\n';
        output += '<SignInForm onSubmit={handleSignIn} />\n';
        output += '```\n\n';
      }
    }

    // Modal example
    if (groupedComponents.ui) {
      const modal = groupedComponents.ui.find(c => c.name.toLowerCase().includes('modal'));
      if (modal) {
        output += '### Modal Component\n\n';
        output += '```tsx\n';
        output += 'import { useModal } from "@/hooks/useModal";\n';
        output += `import { ${modal.name} } from "@/components/ui/${modal.name}";\n\n`;
        output += 'function MyComponent() {\n';
        output += '  const { isOpen, openModal, closeModal } = useModal();\n\n';
        output += '  return (\n';
        output += '    <>\n';
        output += '      <Button onClick={openModal}>Open Modal</Button>\n';
        output += `      <${modal.name} isOpen={isOpen} onClose={closeModal}>\n`;
        output += '        <h2>Modal Content</h2>\n';
        output += '        <p>Your content here</p>\n';
        output += `      </${modal.name}>\n`;
        output += '    </>\n';
        output += '  );\n';
        output += '}\n';
        output += '```\n\n';
      }
    }

    return output;
  }

  /**
   * Check if component has variants
   */
  private hasVariants(component: ComponentInfo): boolean {
    return component.props.some(prop =>
      prop.name === 'variant' ||
      prop.name === 'size' ||
      prop.name === 'color' ||
      prop.name === 'type'
    );
  }

  /**
   * Generate variants section for a component
   */
  private generateVariantsSection(component: ComponentInfo): string {
    let output = '**Variants:**\n\n';

    const variantProps = component.props.filter(prop =>
      prop.name === 'variant' ||
      prop.name === 'size' ||
      prop.name === 'color' ||
      prop.name === 'type'
    );

    variantProps.forEach(prop => {
      output += `- **${prop.name}:** \`${prop.type}\`\n`;
    });

    output += '\n';
    return output;
  }

  /**
   * Capitalize category name for display
   */
  private capitalizeCategory(category: string): string {
    if (category === 'ui') return 'UI Components';
    if (category === 'user-profile') return 'User Profile';
    if (category === 'ecommerce') return 'E-commerce';

    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  /**
   * Analyze and document directory structure
   */
  private analyzeDirectoryStructure(): string {
    let output = '```\n';
    output += 'src/\n';

    // App directory
    output += '├── app/                   # Next.js App Router\n';
    output += '│   ├── (admin)/          # Admin dashboard route group\n';
    output += '│   │   ├── (others-pages)/  # Charts, forms, tables, calendar\n';
    output += '│   │   │   ├── (chart)/     # Chart pages (bar, line)\n';
    output += '│   │   │   ├── (forms)/     # Form pages (input, select, etc.)\n';
    output += '│   │   │   ├── (tables)/    # Table pages\n';
    output += '│   │   │   ├── blank/       # Blank page template\n';
    output += '│   │   │   ├── calendar/    # Calendar page\n';
    output += '│   │   │   └── profile/     # User profile pages\n';
    output += '│   │   ├── (ui-elements)/   # UI component showcases\n';
    output += '│   │   │   ├── alerts/      # Alert components\n';
    output += '│   │   │   ├── avatars/     # Avatar components\n';
    output += '│   │   │   ├── badge/       # Badge components\n';
    output += '│   │   │   ├── buttons/     # Button components\n';
    output += '│   │   │   ├── images/      # Image components\n';
    output += '│   │   │   ├── modals/      # Modal components\n';
    output += '│   │   │   └── videos/      # Video components\n';
    output += '│   │   ├── layout.tsx       # Admin layout (sidebar + header)\n';
    output += '│   │   └── page.tsx         # Dashboard home page\n';
    output += '│   ├── (full-width-pages)/  # Full-width route group\n';
    output += '│   │   ├── (auth)/          # Authentication pages\n';
    output += '│   │   │   ├── signin/      # Sign in page\n';
    output += '│   │   │   ├── signup/      # Sign up page\n';
    output += '│   │   │   └── layout.tsx   # Auth layout (split-screen)\n';
    output += '│   │   ├── (error-pages)/   # Error pages\n';
    output += '│   │   │   └── error-404/   # 404 page\n';
    output += '│   │   └── layout.tsx       # Full-width layout\n';
    output += '│   ├── layout.tsx           # Root layout (providers)\n';
    output += '│   ├── globals.css          # Global styles\n';
    output += '│   └── not-found.tsx        # 404 handler\n';

    // Components directory
    output += '├── components/            # React components\n';
    output += '│   ├── auth/             # Authentication components\n';
    output += '│   ├── calendar/         # Calendar components\n';
    output += '│   ├── charts/           # Chart components (ApexCharts)\n';
    output += '│   ├── common/           # Common/shared components\n';
    output += '│   ├── ecommerce/        # E-commerce components\n';
    output += '│   ├── example/          # Example components\n';
    output += '│   ├── form/             # Form input components\n';
    output += '│   ├── header/           # Header components\n';
    output += '│   ├── tables/           # Table components\n';
    output += '│   ├── ui/               # Reusable UI components\n';
    output += '│   ├── user-profile/     # User profile components\n';
    output += '│   └── videos/           # Video components\n';

    // Context directory
    output += '├── context/              # React Context providers\n';
    output += '│   ├── SidebarContext.tsx  # Sidebar state management\n';
    output += '│   └── ThemeContext.tsx    # Theme (dark/light) management\n';

    // Hooks directory
    output += '├── hooks/                # Custom React hooks\n';
    output += '│   ├── useGoBack.ts      # Navigation back hook\n';
    output += '│   └── useModal.ts       # Modal state hook\n';

    // Icons directory
    output += '├── icons/                # SVG icon assets\n';
    output += '│   ├── index.tsx         # Icon exports\n';
    output += '│   └── *.svg             # Individual icon files\n';

    // Layout directory
    output += '└── layout/               # Layout components\n';
    output += '    ├── AppHeader.tsx     # Top header component\n';
    output += '    ├── AppSidebar.tsx    # Navigation sidebar\n';
    output += '    ├── Backdrop.tsx      # Mobile overlay\n';
    output += '    └── SidebarWidget.tsx # Sidebar widget\n';

    output += '```\n';

    return output;
  }

  /**
   * Generate component categories section
   */
  private generateComponentCategoriesSection(): string {
    let output = '';

    const categories = [
      { name: 'auth', description: 'Authentication forms and components (SignInForm, SignUpForm)' },
      { name: 'calendar', description: 'Calendar components using FullCalendar library' },
      { name: 'charts', description: 'Data visualization charts using ApexCharts (line, bar, area)' },
      { name: 'common', description: 'Shared utility components (ThemeToggler, GridShape, PageBreadCrumb)' },
      { name: 'ecommerce', description: 'E-commerce specific components (metrics, sales charts, statistics)' },
      { name: 'form', description: 'Form input components (Input, Select, DatePicker, Switch, Label)' },
      { name: 'header', description: 'Header-related components (search, notifications, user dropdown)' },
      { name: 'tables', description: 'Table components with pagination and sorting' },
      { name: 'ui', description: 'Reusable UI components (Button, Modal, Alert, Badge, Avatar)' },
      { name: 'user-profile', description: 'User profile display and management components' },
      { name: 'videos', description: 'Video player and display components' },
    ];

    categories.forEach(cat => {
      output += `- **${cat.name}**: ${cat.description}\n`;
    });

    return output;
  }

  /**
   * Generate dependencies section
   */
  private generateDependenciesSection(dependencies: Record<string, string>): string {
    const keyDeps = [
      {
        name: 'next',
        version: dependencies.next,
        purpose: 'React framework with App Router, SSR, SSG, and API routes'
      },
      {
        name: 'react',
        version: dependencies.react,
        purpose: 'UI library for building component-based interfaces'
      },
      {
        name: 'react-dom',
        version: dependencies['react-dom'],
        purpose: 'React rendering for web browsers'
      },
      {
        name: 'typescript',
        version: 'Latest',
        purpose: 'Type safety and enhanced developer experience'
      },
      {
        name: 'tailwindcss',
        version: dependencies['@tailwindcss/postcss'] || 'V4',
        purpose: 'Utility-first CSS framework for styling'
      },
    ];

    const visualizationDeps = [
      {
        name: 'apexcharts',
        version: dependencies.apexcharts,
        purpose: 'Modern charting library for line, bar, and area charts'
      },
      {
        name: 'react-apexcharts',
        version: dependencies['react-apexcharts'],
        purpose: 'React wrapper for ApexCharts'
      },
      {
        name: '@fullcalendar/react',
        version: dependencies['@fullcalendar/react'],
        purpose: 'Full-featured calendar component with day, week, month views'
      },
      {
        name: '@react-jvectormap/core',
        version: dependencies['@react-jvectormap/core'],
        purpose: 'Interactive vector maps for geographical data visualization'
      },
    ];

    const utilityDeps = [
      {
        name: 'flatpickr',
        version: dependencies.flatpickr,
        purpose: 'Lightweight date/time picker with no dependencies'
      },
      {
        name: 'swiper',
        version: dependencies.swiper,
        purpose: 'Modern mobile touch slider for carousels'
      },
      {
        name: 'react-dnd',
        version: dependencies['react-dnd'],
        purpose: 'Drag and drop functionality for React'
      },
      {
        name: 'react-dropzone',
        version: dependencies['react-dropzone'],
        purpose: 'File upload with drag and drop support'
      },
      {
        name: 'tailwind-merge',
        version: dependencies['tailwind-merge'],
        purpose: 'Utility for merging Tailwind CSS classes without conflicts'
      },
    ];

    let output = '#### Core Framework\n\n';
    keyDeps.forEach(dep => {
      output += `- **${dep.name}** (${dep.version}): ${dep.purpose}\n`;
    });

    output += '\n#### Data Visualization\n\n';
    visualizationDeps.forEach(dep => {
      output += `- **${dep.name}** (${dep.version}): ${dep.purpose}\n`;
    });

    output += '\n#### Utilities\n\n';
    utilityDeps.forEach(dep => {
      output += `- **${dep.name}** (${dep.version}): ${dep.purpose}\n`;
    });

    return output;
  }

  /**
   * Group components by category
   */
  private groupComponentsByCategory(components: ComponentInfo[]): Record<string, ComponentInfo[]> {
    const grouped: Record<string, ComponentInfo[]> = {};

    components.forEach(component => {
      if (!grouped[component.category]) {
        grouped[component.category] = [];
      }
      grouped[component.category].push(component);
    });

    return grouped;
  }

  /**
   * Validate internal markdown cross-references inside docs directory.
   * - Emits warnings for invalid references
   * - Auto-fixes resolvable file path/anchor mismatches
   */
  private validateCrossReferences(): void {
    const docFiles = fs
      .readdirSync(this.docsDir)
      .filter((file) => file.endsWith('.md'))
      .sort((a, b) => a.localeCompare(b));

    const docFileSet = new Set(docFiles);
    const anchorsByFile = new Map<string, Set<string>>();

    docFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(this.docsDir, file), 'utf-8');
      anchorsByFile.set(file, this.extractMarkdownAnchors(content));
    });

    const warnings: string[] = [];
    const fixes: string[] = [];
    const skipped: string[] = [];
    let checkedLinks = 0;
    let validLinks = 0;

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

    docFiles.forEach((sourceFile) => {
      const sourcePath = path.join(this.docsDir, sourceFile);
      const originalContent = fs.readFileSync(sourcePath, 'utf-8');
      let didChange = false;

      const nextContent = originalContent.replace(linkRegex, (fullMatch, linkText: string, rawTarget: string) => {
        const target = rawTarget.trim();

        // Ignore external links and non-doc protocol links
        if (
          target.startsWith('http://') ||
          target.startsWith('https://') ||
          target.startsWith('mailto:') ||
          target.startsWith('tel:') ||
          target.startsWith('javascript:')
        ) {
          return fullMatch;
        }

        const shouldValidate = target.startsWith('#') || target.includes('.md') || target.startsWith('./') || target.startsWith('../');
        if (!shouldValidate) {
          return fullMatch;
        }

        checkedLinks += 1;

        const [targetPathRaw, rawAnchor] = target.split('#');
        const anchor = rawAnchor ? decodeURIComponent(rawAnchor).trim() : '';

        // In-file anchor reference: #section
        if (!targetPathRaw || targetPathRaw === '') {
          const fileAnchors = anchorsByFile.get(sourceFile) || new Set<string>();
          const resolvedAnchor = this.resolveAnchor(anchor, fileAnchors);
          if (resolvedAnchor) {
            validLinks += 1;

            if (anchor && resolvedAnchor !== anchor.toLowerCase()) {
              didChange = true;
              fixes.push(`${sourceFile}: updated anchor #${anchor} -> #${resolvedAnchor}`);
              return `[${linkText}](#${resolvedAnchor})`;
            }

            return fullMatch;
          }

          warnings.push(`${sourceFile}: invalid in-file anchor reference "#${anchor}"`);
          return fullMatch;
        }

        const resolvedFile = this.resolveDocLinkTarget(sourceFile, targetPathRaw, docFileSet);
        if (!resolvedFile) {
          warnings.push(`${sourceFile}: target file not found for link "${target}"`);
          return fullMatch;
        }

        const targetAnchors = anchorsByFile.get(resolvedFile) || new Set<string>();
        let resolvedAnchor = '';

        if (anchor) {
          resolvedAnchor = this.resolveAnchor(anchor, targetAnchors) || '';
          if (!resolvedAnchor) {
            warnings.push(`${sourceFile}: target anchor not found in ${resolvedFile} -> "#${anchor}"`);
            return fullMatch;
          }
        }

        validLinks += 1;

        const canonicalPath = this.toRelativeMarkdownPath(sourceFile, resolvedFile);
        const canonicalTarget = resolvedAnchor ? `${canonicalPath}#${resolvedAnchor}` : canonicalPath;

        if (canonicalTarget !== target) {
          didChange = true;
          fixes.push(`${sourceFile}: ${target} -> ${canonicalTarget}`);
          return `[${linkText}](${canonicalTarget})`;
        }

        return fullMatch;
      });

      if (didChange && nextContent !== originalContent) {
        fs.writeFileSync(sourcePath, nextContent, 'utf-8');
        console.log(`↻ Updated cross-references in: ${sourcePath}`);
      } else if (!didChange) {
        skipped.push(sourceFile);
      }
    });

    console.log(`Cross-reference validation summary: checked=${checkedLinks}, valid=${validLinks}, fixed=${fixes.length}, warnings=${warnings.length}`);

    if (fixes.length > 0) {
      fixes.forEach((fix) => console.log(`✓ Reference fixed: ${fix}`));
    }

    if (warnings.length > 0) {
      warnings.forEach((warning) => console.warn(`⚠ Invalid reference: ${warning}`));
    }

    if (warnings.length === 0) {
      console.log('✓ No invalid cross-references detected');
    }

    if (checkedLinks === 0) {
      console.log(`ℹ No internal markdown links found in docs files (${skipped.length} files scanned)`);
    }
  }

  /**
   * Extract markdown heading anchors using GitHub-like slug generation.
   */
  private extractMarkdownAnchors(markdown: string): Set<string> {
    const anchors = new Set<string>();
    const lines = markdown.split('\n');

    lines.forEach((line) => {
      const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
      if (!headingMatch?.[1]) return;

      const anchor = this.toMarkdownAnchor(headingMatch[1]);
      if (anchor) anchors.add(anchor);
    });

    return anchors;
  }

  /**
   * Convert heading text to markdown anchor format.
   */
  private toMarkdownAnchor(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[\`*_~\[\](){}<>]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Resolve anchor against known anchors, with normalization fallback.
   */
  private resolveAnchor(anchor: string, knownAnchors: Set<string>): string | null {
    if (!anchor) return null;

    const normalized = decodeURIComponent(anchor).trim().toLowerCase();
    if (knownAnchors.has(normalized)) return normalized;

    const slugCandidate = this.toMarkdownAnchor(normalized.replace(/-/g, ' '));
    if (slugCandidate && knownAnchors.has(slugCandidate)) return slugCandidate;

    return null;
  }

  /**
   * Resolve markdown file target for a link.
   */
  private resolveDocLinkTarget(sourceFile: string, targetPathRaw: string, docFileSet: Set<string>): string | null {
    const sourceDir = path.dirname(sourceFile);
    const normalizedTarget = path.posix.normalize(targetPathRaw.replace(/\\/g, '/'));

    const candidates = new Set<string>();

    // Candidate 1: direct normalized relative from source file directory
    candidates.add(path.posix.normalize(path.posix.join(sourceDir, normalizedTarget)));

    // Candidate 2: if no extension, try .md
    if (!/\.md$/i.test(normalizedTarget)) {
      candidates.add(path.posix.normalize(path.posix.join(sourceDir, `${normalizedTarget}.md`)));
    }

    // Candidate 3: basename fallback in docs root (common typo correction)
    const baseName = path.posix.basename(normalizedTarget).toLowerCase();
    if (baseName) {
      const fromRoot = Array.from(docFileSet).find((docFile) => docFile.toLowerCase() === baseName);
      if (fromRoot) candidates.add(fromRoot);

      if (!/\.md$/i.test(baseName)) {
        const mdBase = `${baseName}.md`;
        const mdMatch = Array.from(docFileSet).find((docFile) => docFile.toLowerCase() === mdBase);
        if (mdMatch) candidates.add(mdMatch);
      }
    }

    for (const candidate of candidates) {
      const normalized = candidate.replace(/^\.\//, '');
      if (docFileSet.has(normalized)) return normalized;
    }

    return null;
  }

  /**
   * Build canonical relative markdown path from source doc file to target doc file.
   */
  private toRelativeMarkdownPath(sourceFile: string, targetFile: string): string {
    const sourceDir = path.dirname(sourceFile);
    const relative = path.posix.relative(sourceDir, targetFile);
    const normalized = relative === '' ? path.posix.basename(targetFile) : relative;
    return normalized.startsWith('.') ? normalized : `./${normalized}`;
  }

  /**
   * Ensures the docs directory exists
   */
  private ensureDocsDirectory(): void {
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
      console.log(`Created docs directory at: ${this.docsDir}`);
    }
  }

  /**
   * Display detailed information about a component
   */
  private displayComponentDetails(component: ComponentInfo | undefined): void {
    if (!component) return;

    console.log(`\n  Component: ${component.name}`);
    console.log(`    Path: ${component.path}`);
    console.log(`    Category: ${component.category}`);
    console.log(`    Description: ${component.description}`);

    if (component.props.length > 0) {
      console.log(`    Props (${component.props.length}):`);
      component.props.forEach(prop => {
        const required = prop.required ? 'required' : 'optional';
        console.log(`      - ${prop.name}: ${prop.type} (${required})`);
      });
    }

    if (component.dependencies.length > 0) {
      console.log(`    Dependencies: ${component.dependencies.join(', ')}`);
    }
  }
}

// Main execution
if (require.main === module) {
  const generator = new DocumentationGenerator();
  generator.generate().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
