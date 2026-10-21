# ⚾ Mario Pelota Team Selector 🎮

> **Selector de equipos y ruleta de personajes inspirada en Mario Baseball, con un toque de humor dominicano.**

![Astro](https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Biome](https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

---

## ⚠️ Aviso Legal y Descargo de Responsabilidad (Disclaimer)

> **IMPORTANTE**: Este es un **proyecto fan-made, no oficial y sin fines de lucro**, desarrollado únicamente con fines recreativos y educativos.
>
> - **Todos los personajes, nombres, imágenes, sonidos, marcas registradas y derechos de autor asociados al universo de Mario y Nintendo pertenecen exclusivamente a [Nintendo Co., Ltd.](https://www.nintendo.com) y sus respectivas filiales.**
> - Este proyecto **no está afiliado, respaldado, patrocinado ni autorizado por Nintendo**.
> - La licencia [MIT](LICENSE) de este repositorio aplica exclusivamente al código fuente desarrollado para la aplicación y no otorga ningún derecho sobre la propiedad intelectual ni los activos pertenecientes a Nintendo.

---

## 🌟 Descripción

**Mario Pelota Team Selector** es una aplicación web interactiva diseñada para generar alineaciones y seleccionar equipos de béisbol de forma aleatoria y dinámica al estilo *Mario Superstar Baseball*.

Incluye apodos jocosos y referencias de la cultura popular / pelota dominicana para cada personaje, soporte para variantes de color (Shy Guy, Koopa, Toad, etc.) y una interfaz visual de estadio con enfrentamiento **Team 1 vs Team 2**.

---

## 🚀 Características

- 🎯 **Ruleta interactiva**: Animación de ruleta aleatoria para elegir personajes en tiempo real.
- 🏟️ **Vista de Estadio & Banner Versus**: Visualización de los dos equipos enfrentados con sus alineaciones.
- 🎨 **Variantes de personajes**: Soporte para diferentes colores y skins clásicos de los personajes secundarios.
- 🇩🇴 **Humor y apodos personalizados**: Nombres y apodos cómicos para cada personaje del roster.
- ⚡ **Rápido y ligero**: Construido con [Astro](https://astro.build/) y TypeScript para un rendimiento óptimo.

---

## 🛠️ Tecnologías Utilizadas

- **Framework**: [Astro](https://astro.build/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: CSS nativo y modular
- **Linter & Formatter**: [Biome](https://biomejs.dev/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Gestor de paquetes**: [pnpm](https://pnpm.io/)

---

## 📦 Instalación y Uso Local

### Prerrequisitos

- **Node.js**: `>= 22.12.0`
- **pnpm**: Recomendado

### Pasos

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/mario-pelota-team-selector.git
   cd mario-pelota-team-selector
   ```

2. **Instalar dependencias**:
   ```bash
   pnpm install
   ```

3. **Iniciar el servidor de desarrollo**:
   ```bash
   pnpm dev
   ```
   Abre [http://localhost:4321](http://localhost:4321) en tu navegador para ver la aplicación.

4. **Ejecutar pruebas unitarias**:
   ```bash
   pnpm test
   ```

5. **Construir para producción**:
   ```bash
   pnpm build
   ```

6. **Previsualizar la compilación de producción**:
   ```bash
   pnpm preview
   ```

---

## 📁 Estructura del Proyecto

```text
mario-pelota-team-selector/
├── public/                 # Archivos estáticos e imágenes de personajes
├── src/
│   ├── assets/             # Gráficos y recursos vectoriales
│   ├── components/         # Componentes Astro (Estadio, Ruleta, UI, Controles)
│   ├── data/               # Datos de personajes, colores y posiciones
│   ├── layouts/            # Layouts principales de la aplicación
│   ├── logic/              # Lógica de ruleta, asignación de equipos y manipulación DOM
│   ├── pages/              # Páginas de la aplicación (index.astro)
│   ├── scripts/            # Controladores del juego y eventos del cliente
│   ├── styles/             # Hojas de estilo CSS globales y de estadio
│   └── types/              # Definiciones de tipos TypeScript
├── tests/                  # Pruebas unitarias con Vitest
├── biome.json              # Configuración de formateo y linting Biome
├── astro.config.mjs        # Configuración de Astro
├── package.json
└── README.md
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

*Recordatorio: Los derechos de propiedad intelectual, marcas y recursos visuales/auditivos de Nintendo corresponden a **Nintendo Co., Ltd.***
