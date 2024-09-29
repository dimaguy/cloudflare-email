import { IContact, IEmail } from '../schema/email';
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage, MailboxType, ContentOptions, MIMEMessage } from "mimetext";

type IMCContact = { addr: string; name?: string; type?: MailboxType };


class Email {
	/**
	 * Sends an email via the Cloudflare Email service.
	 * @param email The email to send, conforming to the IEmail interface.
	 * @param env The environment variables, containing the SEB worker.
	 * @returns A promise that resolves when the email is sent.
	 */
	static async send(email: IEmail, env: Env): Promise<void> {
		const msg: MIMEMessage = Email.convertEmail(email);

		let fromAddress: string;
		if (typeof email.from === 'string') {
			fromAddress = email.from;
		} else {
			fromAddress = email.from.address;
		}

		let toAddresses: string;
		toAddresses = email.to;

		var message = new EmailMessage(
			fromAddress,
			toAddresses,
			msg.asRaw(),
		)
		try {
			await env.SEB.send(message)
		} catch (e) {
			throw new Error(`Error sending email: ${e.message}`);
		}

	}


	/**
	 * Converts an IEmail to an IMCEmail
	 * @param email
	 * @protected
	 */
	protected static convertEmail(email: IEmail): MIMEMessage {
		if (!email) {
			throw new Error("Email is null or undefined");
		}

		const from: IMCContact = Email.convertContact(email.from);
		if (!from) {
			throw new Error("Email.from is null or undefined");
		}

		const toContacts: IMCContact[] = Email.convertContacts(email.to, 'To');
		if (!toContacts || toContacts.length === 0) {
			throw new Error("Email.to is null, undefined, or empty");
		}

		const subject: string = email.subject;
		if (!subject) {
			throw new Error("Email.subject is null or undefined");
		}

		const msg = createMimeMessage();
		msg.setSender(from);
		msg.setTo(toContacts);
		msg.setSubject(subject);

		let Recipients: IMCContact[] = [];
		Recipients = Recipients.concat(toContacts);


		// Convert 'cc' field
		let ccContacts: IMCContact[] = [];
		if (email.cc) {
			ccContacts = Email.convertContacts(email.cc, 'Cc');
			if (ccContacts && ccContacts.length > 0) {
				Recipients = Recipients.concat(ccContacts);
			}
		}

		let bccContacts: IMCContact[] = [];
		// Convert 'bcc' field
		if (email.bcc) {
			bccContacts = Email.convertContacts(email.bcc, 'Bcc');
			if (bccContacts && bccContacts.length > 0) {
				Recipients = Recipients.concat(bccContacts);
			}
		}

		// Convert 'text' field

		if (email.text) {
			const textContent: ContentOptions = { contentType: 'text/plain', data: email.text }
			msg.addMessage(textContent);
		}

		// Convert 'html' field

		if (email.html) {
			const htmlContent: ContentOptions = { contentType: 'text/html', data: email.html }
			msg.addMessage(htmlContent);
		}

		return msg
	}
	/**
	 * Converts an IContact or IContact[] to a Contact[]
	 * @param contacts
	 * @param type - An optional parameter of type MailboxType
	 * @protected
	 */
	protected static convertContacts(contacts: IContact | IContact[], type?: MailboxType): IMCContact[] {
		if (!contacts) {
			return [];
		}

		const contactArray: IContact[] = Array.isArray(contacts) ? contacts : [contacts];

		const convertedContacts: IMCContact[] = contactArray.map(contact => {
			const convertedContact = Email.convertContact(contact);

			// 如果 type 存在，附加到 convertedContact 中
			if (type) {
				convertedContact.type = type; // 假设 IMCContact 中有一个 type 属性
			}

			return convertedContact;
		});

		return convertedContacts;
	}


	/**
	 * Converts an IContact to a Contact
	 * @param contact
	 * @protected
	 */
	protected static convertContact(contact: IContact): IMCContact {
		return typeof contact === 'string'
			? { addr: contact }
			: { addr: contact.address, name: contact.name };
	}
}

export default Email;
