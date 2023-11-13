const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs')
const rss = require('rss');
const app = express();
const PORT = process.env.PORT || 3000;


async function extraer_image_url(url_article){

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url_article, { waitUntil: 'domcontentloaded' });
    
        // Espera a que la página ejecute su JavaScript (puedes ajustar el tiempo de espera según sea necesario)
        await page.waitForTimeout(3000);
    
        // Extrae los datos después de que se haya ejecutado el JavaScript
        const url_image = await page.evaluate(() => {
            var elementoDiv = document.querySelector('.text-white');

            // Obtén el valor del atributo style
            var estilo = elementoDiv.getAttribute('style');
            
            // Divide la cadena de estilo en partes usando el punto y coma como separador
            var partesEstilo = estilo.split(';');
            
            // Busca la parte que contiene 'background-image'
            var parteFondo = partesEstilo.find(function (parte) {
              return parte.includes('background-image');
            });
            
            // Extrae la URL de la parte que contiene la URL de la imagen
            var urlImagen = parteFondo.match(/url\("(.*?)"/)[1];
    
          return urlImagen;
        });
    
        await browser.close();
        
        // Devuelve los datos extraídos si es necesario
        return url_image;
    
      } catch (error) {
        console.error(`Error al extraer datos: ${error.message}`);
        // Manejar el error según tus necesidades
      }
}

async function extraerDatos() {
    const url = 'https://www.sheepesports.com/browse/LEAGUE';

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Espera a que la página ejecute su JavaScript (puedes ajustar el tiempo de espera según sea necesario)
        await page.waitForTimeout(3000);

        await page.exposeFunction('extraer_image_url', extraer_image_url);

        // Extrae los datos después de que se haya ejecutado el JavaScript
        const elementos = await page.evaluate(() => {
            const elementos = document.querySelectorAll('.mb-4.md\\:mb-0');
            const datos = [];

            elementos.forEach((elemento) => {
                const titulo = elemento.querySelector('h2.text-white').textContent.trim();
                const url = "https://www.sheepesports.com" + elemento.querySelector("a").attributes.getNamedItem("href").textContent.trim();
                const imageURL = extraer_image_url(url)
                datos.push({ titulo, url, imageURL });
            });

            return datos;
        });

        // Espera a que se completen todas las promesas de extraer_image_url
        const datosConImagenes = await Promise.all(elementos.map(async (elemento) => {
            try {
                const imageURL = await elemento.imageURL;
                return { ...elemento, imageURL };
            } catch (error) {
                console.error(`Error al extraer datos de la imagen: ${error.message}`);
                // Manejar el error según tus necesidades
                return elemento;
            }
        }));

        await browser.close();

        // Imprime los datos extraídos después de cerrar el navegador
        console.log('Datos extraídos:', datosConImagenes);

        // Devuelve los datos extraídos si es necesario
        return datosConImagenes;

    } catch (error) {
        console.error(`Error al extraer datos: ${error.message}`);
        // Manejar el error según tus necesidades
    }
}

async function cargar_rss(){
    try {
        // Espera a que se resuelva la promesa devuelta por extraerDatos
        const articulos = await extraerDatos();

        const feed = new rss({
            title: 'Sheep Esports',
            feed_url: 'https://github.com/agonben23/sheep_esports_rss_generator/feed.xml',
            site_url: 'https://github.com/agonben23/sheep_esports_rss_generator',
        });

        for (let i = 0; i < articulos.length; i++) {
            feed.item({
                title: articulos[i]['titulo'],
                url : articulos[i]['url'],
                imageURL : articulos[i]['imageURL']
                // Otros campos del ítem del feed
            });
        }

        // Escribe el feed RSS en el archivo
        await fs.writeFileSync('feed.xml', feed.xml());

    } catch (error) {
        console.error(`Error al generar el feed RSS: ${error.message}`);
        // Manejar el error según tus necesidades
        res.status(500).send('Error interno del servidor');
    }
}

// Endpoint para generar el feed RSS
app.get('/rss', async (req, res) => {

    try {
        // Espera a que se resuelva la promesa devuelta por extraerDatos
        const articulos = await extraerDatos();

        const feed = new rss({
            title: 'Sheep Esports',
            feed_url: 'https://github.com/${process.env.GITHUB_REPOSITORY}/feed.xml',
            site_url: 'https://github.com/${process.env.GITHUB_REPOSITORY}',
        });

        for (let i = 0; i < articulos.length; i++) {
            feed.item({
                title: articulos[i]['titulo'],
                url : articulos[i]['url'],
                imageURL : articulos[i]['imageURL']
                // Otros campos del ítem del feed
            });
        }

        // Escribe el feed RSS en el archivo
        await fs.writeFileSync('feed.xml', feed.xml());

    } catch (error) {
        console.error(`Error al generar el feed RSS: ${error.message}`);
        // Manejar el error según tus necesidades
        res.status(500).send('Error interno del servidor');
    }
});

// Servidor escuchando en el puerto especificado
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
