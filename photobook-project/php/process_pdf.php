<?php
// php/process_pdf.php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';

if (isset($_FILES['photobook_pdf']) && $_FILES['photobook_pdf']['error'] == UPLOAD_ERR_OK) {
    
    $priceInfo = isset($_POST['total_price']) ? $_POST['total_price'] : 'Unknown Price';
    
    // File details
    $fileTmpPath = $_FILES['photobook_pdf']['tmp_name'];
    $fileName = $_FILES['photobook_pdf']['name'];

    $mail = new PHPMailer(true);

    try {
        // --- SMTP Server Settings ---
        $mail->isSMTP();                                            
        $mail->Host       = 'smtp.gmail.com';                     
        $mail->SMTPAuth   = true;                                   
        $mail->Username   = 'mccartisansmultimedia@gmail.com';     
        $mail->Password   = 'ixxucnshdojqnhwh'; // <-- PASTE YOUR APP PASSWORD HERE (No spaces)
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;            
        $mail->Port       = 587;                                    

        // --- Email Headers ---
        $mail->setFrom('mccartisansmultimedia@gmail.com', 'Photobook Orders');
        $mail->addAddress('mccartisansmultimedia@gmail.com', 'DMC Busa Printers');     

        // --- Attach the PDF ---
        $mail->addAttachment($fileTmpPath, $fileName);

        // --- Email Content ---
        $mail->isHTML(false);
        $mail->Subject = "New Photobook Order Received!";
        
        $message = "Hello!\n\nA new photobook has been designed and submitted by a customer.\n";
        $message .= "The estimated price is: " . $priceInfo . "\n\n";
        $message .= "Please find the attached PDF ready for printing.";
        
        $mail->Body = $message;

        // Send the email!
        $mail->send();
        echo "Your photobook has been successfully sent to the printer!";
        
    } catch (Exception $e) {
        echo "Error: The server failed to send the email. Mailer Error: {$mail->ErrorInfo}";
    }

} else {
    echo "Error: No PDF file was received by the server.";
}
?>