import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Función para dividir texto en líneas
function dividirTextoEnLineas(texto, maxCaracteresPorLinea = 70) {
  const palabras = texto.split(' ');
  const lineas = [];
  let lineaActual = '';

  for (const palabra of palabras) {
    if ((lineaActual + ' ' + palabra).trim().length <= maxCaracteresPorLinea) {
      lineaActual += ' ' + palabra;
    } else {
      lineas.push(lineaActual.trim());
      lineaActual = palabra;
    }
  }
  if (lineaActual.trim() !== '') {
    lineas.push(lineaActual.trim());
  }

  return lineas;
}

app.post('/enviar-pdf', async (req, res) => {
  const { nombre, pedido, fechaEntrega, notas, correo } = req.body;

  try {
const pdfBytes = await readFile('./plantilla_zona_correcta_final_v14_REAL.pdf');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const size = 11;
    const lineHeight = 18;

    // Coordenadas base
    const xEtiqueta = 70;
    const xTexto = 190;
    const xTextoFecha = 250;

    let yBase = 480;

    const notasLineas = dividirTextoEnLineas(notas);
    const yNotas = yBase;
    const yFecha = yNotas - (notasLineas.length * lineHeight + 15);
    const fechaLineas = dividirTextoEnLineas(fechaEntrega);
    const yPedido = yFecha - (fechaLineas.length * lineHeight + 15);
    const pedidoLineas = dividirTextoEnLineas(pedido);

    // Dibujar etiquetas
    page.drawText('Notas:', { x: xEtiqueta, y: yNotas, size, font: bold });
    page.drawText('Fecha de entrega:', { x: xEtiqueta, y: yFecha, size, font: bold });
    page.drawText('Pedido:', { x: xEtiqueta, y: yPedido, size, font: bold });

    // Dibujar contenido multilínea
    notasLineas.forEach((linea, i) => {
      page.drawText(linea, { x: xTexto, y: yNotas - i * lineHeight, size, font });
    });

    fechaLineas.forEach((linea, i) => {
      page.drawText(linea, { x: xTextoFecha, y: yFecha - i * lineHeight, size, font });
    });

    pedidoLineas.forEach((linea, i) => {
      page.drawText(linea, { x: xTexto, y: yPedido - i * lineHeight, size, font });
    });

    const pdfFinal = await pdfDoc.save();

    // Configurar transporte
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"HM Encuadernaciones" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: 'Actualización de su pedido | HM Encuadernaciones',
      text: `Estimado(a) ${nombre}, adjuntamos la actualización de su pedido.`,
      attachments: [
        {
          filename: 'actualizacion_pedido.pdf',
          content: Buffer.from(pdfFinal),
          contentType: 'application/pdf'
        }
      ]
    });

    res.status(200).json({ success: true, message: 'Correo enviado exitosamente.' });

  } catch (err) {
    console.error('❌ Error al enviar el PDF:', err);
    res.status(500).json({ success: false, message: 'Error al generar o enviar el PDF.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`📦 Servidor escuchando en el puerto ${PORT}`));
