MonMovies (Proyecto Tienda de Películas)
 Esta es una aplicación web Full-Stack que simula una tienda digital de películas (tipo "Blockbuster" digital), donde los usuarios pueden registrarse, explorar un catálogo de películas y rentar o comprar estas. La aplicación cuenta con un panel de administrador completo para la gestión de inventario.

El proyecto está construido con Node.js y Handlebars, utiliza una base de datos MySQL y está diseñado para ser desplegado en un clúster de Kubernetes.

Arquitectura del Sistema
El proyecto sigue una arquitectura de renderizado del lado del servidor (SSR) orquestada por Kubernetes:

Backend (Node.js / Express): Un servidor de Node.js que actúa como el "cerebro". Maneja la lógica de negocio, la autenticación de usuarios (passport.js), las rutas y la comunicación con la base de datos.

Frontend (Handlebars): El servidor de Node.js utiliza plantillas de Handlebars (.hbs) para "rellenar" el HTML con datos de la base de datos antes de enviarlo al cliente. El diseño es responsivo gracias a Bootstrap 4.

Base de Datos (MySQL): Una base de datos relacional que almacena toda la información persistente: usuarios, películas, actores, géneros, pedidos, carritos y sesiones de usuario.

Despliegue (Kubernetes):

La aplicación de Node.js corre como un Deployment.

La base de datos MySQL corre como un StatefulSet (o Deployment) con un PersistentVolumeClaim (PVC) para asegurar que los datos sobrevivan a los reinicios.

Se utilizan Secrets para gestionar de forma segura las contraseñas de la base de datos.

Se usan Services (tipo NodePort) para exponer la aplicación y la base de datos a la red.

Tecnologías Utilizadas
Backend: Node.js, Express

Frontend: Handlebars.js, Bootstrap 4, HTML5, CSS3

Base de Datos: MySQL

Autenticación y Sesiones: Passport.js, express-session, express-mysql-session (para almacenar sesiones en MySQL), bcryptjs (para hasheo de contraseñas)

Notificaciones: connect-flash (para mensajes de error y éxito)

Despliegue: Docker, Kubernetes (YAML)

Instrucciones de Instalación
Sigue estos pasos para correr el proyecto localmente.

Prerrequisitos
Node.js (v16 o superior)

Un clúster de Kubernetes (como Minikube, k3s, o uno propio)

kubectl configurado para apuntar a tu clúster.

Un cliente de MySQL (como MySQL Workbench)

-> Clonar el Repositorio
Bash

git clone https://github.com/MonsOropezaaa/Tienda_de_Peliculas.git
cd Tienda_de_Peliculas
Instalar Dependencias (Backend)
Bash

npm install
Desplegar la Base de Datos (Kubernetes)
-> Aplica los manifiestos de Kubernetes en el orden correcto para levantar la base de datos:

Bash

 El Secreto (contraseña)
kubectl apply -f mysql-secret.yaml

El Volumen Físico (Disco)
kubectl apply -f mysql-pv.yaml

 La Solicitud de Volumen (PVC)
kubectl apply -f mysql-pvc.yaml

 La Aplicación MySQL
kubectl apply -f mysql-deployment.yaml

 El Servicio (Acceso externo)
kubectl apply -f mysql-nodeport.yaml
Verifica que el pod esté corriendo con kubectl get pods.

-> Cargar el Script de la Base de Datos
Abre MySQL Workbench.

Crea una nueva conexión usando la IP de tu nodo master de K8s y el puerto 30306.

Usa el usuario root y la contraseña de tu mysql-secret.yaml (Mailo281001).

Abre el archivo database/db.sql y ejecútalo para crear todas las tablas e insertar los datos de ejemplo.

 Configurar Variables de Entorno
Crea un archivo llamado .env en la raíz del proyecto.

Copia y pega el siguiente contenido (ajusta la IP y el puerto si son diferentes):

Fragmento de código

HOST=192.168.80.150
PORT=30306
DATABASE=tienda_peliculas
USER=root
PASSWORD=Mailo281001

 Ejecutar la Aplicación
Bash

npm run dev
Abre tu navegador y ve a http://localhost:4000/peliculas.

Guía de Uso
La aplicación tiene dos flujos de usuario principales:

* Como Cliente
Registro y Login: Puedes crear una cuenta nueva (/signup) o iniciar sesión (/signin).

Navegación: Explora el catálogo principal, filtra por géneros usando el dropdown dinámico o usa la barra de búsqueda (busca por Título, Actor, Director o Año).

Ver Detalles: Haz clic en "Ver detalles" en cualquier película para abrir una ventana modal con la descripción completa, actores, etc.

Carrito:

Añade películas para "Rentar" o "Comprar".

La aplicación controla el stock; no puedes añadir películas agotadas.

Dentro del carrito, puedes ajustar la cantidad (+, -) o eliminar artículos (Eliminar).

Checkout: Al "Pagar", la aplicación ejecuta una transacción que mueve tu carrito a un PEDIDO y DETALLE_PEDIDO permanente, y vacía tu carrito.

Perfil: En "Mi Perfil" puedes ver tu historial de pedidos anteriores y ver los detalles de cada uno.

* Como Administrador (Rol: 'ADMIN')
Acceso: Inicia sesión con una cuenta de 'ADMIN'. La barra de navegación mostrará enlaces al "Panel de Admin".

Panel de Admin: Una vista del catálogo que incluye botones de "Editar" y "Eliminar" en cada tarjeta.

Agregar Película: Un formulario (/peliculas/add) que te permite agregar una película.

Lógica Inteligente: Puedes escribir nombres de actores o directores nuevos (separados por comas). El backend los creará si no existen y los conectará automáticamente a la película, todo dentro de una transacción.

Editar Película: Un formulario (/peliculas/edit/:id) que te permite actualizar todos los datos de una película, incluyendo la "sincronización" de actores y directores (borra los antiguos y añade los nuevos).

Agregar Género: Un formulario simple para añadir nuevos géneros al catálogo.
