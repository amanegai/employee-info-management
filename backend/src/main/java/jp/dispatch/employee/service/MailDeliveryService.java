package jp.dispatch.employee.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class MailDeliveryService {

    private static final Logger log = LoggerFactory.getLogger(MailDeliveryService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean enabled;

    @Value("${app.mail.from:}")
    private String fromAddress;

    public MailDeliveryService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public boolean send(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            return false;
        }
        if (!isConfigured()) {
            log.info("[mail:disabled] to={} subject={}", to, subject);
            log.debug("[mail:disabled] body:\n{}", body);
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to.trim());
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("[mail:sent] to={} subject={}", to, subject);
            return true;
        } catch (Exception ex) {
            log.error("[mail:failed] to={} subject={} error={}", to, subject, ex.getMessage());
            return false;
        }
    }

    public boolean sendWithAttachment(
            String to,
            String subject,
            String body,
            String attachmentFilename,
            Resource attachmentResource,
            String contentType
    ) {
        if (to == null || to.isBlank()) {
            return false;
        }
        if (!isConfigured()) {
            log.info("[mail:disabled] to={} subject={} attachment={}", to, subject, attachmentFilename);
            return false;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, attachmentResource != null);
            helper.setFrom(fromAddress);
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(body != null ? body : "", false);
            if (attachmentResource != null && attachmentFilename != null && !attachmentFilename.isBlank()) {
                String resolvedType = contentType != null && !contentType.isBlank()
                        ? contentType
                        : "application/octet-stream";
                helper.addAttachment(attachmentFilename, attachmentResource, resolvedType);
            }
            mailSender.send(message);
            log.info("[mail:sent] to={} subject={} attachment={}", to, subject, attachmentFilename);
            return true;
        } catch (Exception ex) {
            log.error("[mail:failed] to={} subject={} attachment={} error={}",
                    to, subject, attachmentFilename, ex.getMessage());
            return false;
        }
    }

    public boolean isConfigured() {
        return enabled && mailSender != null && fromAddress != null && !fromAddress.isBlank();
    }

    public String configuredFromAddress() {
        return fromAddress;
    }
}
