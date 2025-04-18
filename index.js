
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.post('/enviar-pdf', async (req, res) => {
  const { nombre, pedido, fechaEntrega, notas, correo } = req.body;

  try {
    const existingPdfBytes = await readFile('./plantilla.pdf');
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;

    // Posiciones X, Y exactas en la plantilla para cada campo
    firstPage.drawText(pedido, { x: 105, y: 490, size: fontSize, font, color: rgb(0, 0, 0) });
    firstPage.drawText(fechaEntrega, { x: 105, y: 460, size: fontSize, font, color: rgb(0, 0, 0) });
    firstPage.drawText(notas, { x: 105, y: 430, size: fontSize, font, color: rgb(0, 0, 0), maxWidth: 400 });

    const pdfBytes = await pdfDoc.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: '"HM Encuadernaciones" <' + process.env.EMAIL_USER + '>',
      to: correo,
      subject: 'Actualización de su pedido | HM Encuadernaciones',
      text: `Estimado(a) ${nombre},

Adjunto encontrará la actualización de su pedido.`,
      attachments: [
        {
          filename: 'actualizacion_pedido.pdf',
          content: Buffer.from(pdfBytes),
          contentType: 'application/pdf'
        }
      ]
    });

    res.status(200).json({ success: true, message: 'Correo enviado exitosamente.' });

  } catch (error) {
    console.error('Error al enviar el PDF:', error);
    res.status(500).json({ success: false, message: 'Hubo un error al enviar el PDF.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor backend iniciado en puerto ${PORT}`));
