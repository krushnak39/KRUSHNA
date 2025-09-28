// Farmer Portal Dashboard Logic
// Uses Firebase Auth (already initialized in parent) and localStorage/mock for now.

import { onAuthStateChangedHandler, signOutUser } from '../firebase.js';

const stateSelectData = [
	'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman & Nicobar','Chandigarh','Dadra & Nagar Haveli and Daman & Diu','Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry'
];

const servicesData = [
	{ id:'pmkisan', title:'PM-KISAN', cat:'subsidy', short:'Income support to farmer families', details:'Provides income support of Rs 6,000 per year to all farmer families in three equal installments.' },
	{ id:'soilcard', title:'Soil Health Card', cat:'advisory', short:'Soil nutrient status & recommendations', details:'Assists farmers in maintaining soil fertility by providing soil test based nutrient recommendations.' },
	{ id:'pmfby', title:'Pradhan Mantri Fasal Bima Yojana', cat:'insurance', short:'Crop Insurance Scheme', details:'Comprehensive risk solution at lowest premium for farmers against crop failure.' },
	{ id:'kcc', title:'Kisan Credit Card', cat:'loan', short:'Working capital credit', details:'Provides short term credit limits for crop cultivation and other needs at subsidized interest.' },
	{ id:'agriAdvisory', title:'Agri Advisory (Kisan Call Center)', cat:'advisory', short:'Crop & pest guidance', details:'Farmers can dial 1800-180-1551 for localized expert advice.' }
];

const views = {};
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
	cacheDom();
	populateStates();
	wireNav();
	renderServices();
	wireForms();
	guard();
});

function cacheDom(){
	views.shell = document.getElementById('app');
	views.navLinks = document.querySelectorAll('.nav-link');
	views.sections = {
		profile: document.getElementById('view-profile'),
		services: document.getElementById('view-services'),
		feedback: document.getElementById('view-feedback')
	};
	views.profileForm = document.getElementById('profileForm');
	views.fbForm = document.getElementById('feedbackForm');
	views.profileStatus = document.getElementById('profileStatus');
	views.feedbackStatus = document.getElementById('feedbackStatus');
	views.stateSelect = document.getElementById('pf-state');
	views.servicesList = document.getElementById('servicesList');
	views.serviceSearch = document.getElementById('serviceSearch');
	views.serviceCategory = document.getElementById('serviceCategory');
	views.feedbackList = document.getElementById('feedbackList');
	views.userEmail = document.getElementById('userEmail');
	views.signOutBtn = document.getElementById('signOutBtn');
}

function guard(){
	onAuthStateChangedHandler(user => {
		currentUser = user;
		if (!user){
			window.location.href = '../index.html';
			return;
		}
		views.userEmail.textContent = user.email || 'Unknown';
		loadProfile();
		loadFeedback();
		views.shell?.removeAttribute('data-loading');
	});
	views.signOutBtn.addEventListener('click', async () => {
		try { await signOutUser(); } catch(e){ console.error(e); }
	});
}

function wireNav(){
	views.navLinks.forEach(btn => btn.addEventListener('click', () => {
		const view = btn.dataset.view;
		setActiveView(view);
	}));
}

function setActiveView(name){
	for (const k in views.sections){
		views.sections[k].classList.toggle('active', k === name);
	}
	views.navLinks.forEach(b => b.classList.toggle('active', b.dataset.view === name));
}

function populateStates(){
	const frag = document.createDocumentFragment();
	stateSelectData.forEach(st => {
		const opt = document.createElement('option');
		opt.value = opt.textContent = st;
		frag.appendChild(opt);
	});
	views.stateSelect.appendChild(frag);
}

function wireForms(){
	views.profileForm.addEventListener('submit', e => {
		e.preventDefault();
		const data = collectProfile();
		saveProfile(data);
	});
	views.fbForm.addEventListener('submit', e => {
		e.preventDefault();
		const fb = collectFeedback();
		if (!fb) return;
		saveFeedback(fb);
	});
	views.serviceSearch.addEventListener('input', renderServices);
	views.serviceCategory.addEventListener('change', renderServices);
}

function collectProfile(){
	return {
		first: document.getElementById('pf-first').value.trim(),
		last: document.getElementById('pf-last').value.trim(),
		phone: document.getElementById('pf-phone').value.trim(),
		district: document.getElementById('pf-district').value.trim(),
		state: document.getElementById('pf-state').value,
		crop: document.getElementById('pf-crop').value.trim(),
		notes: document.getElementById('pf-notes').value.trim(),
		updated: Date.now()
	};
}

function saveProfile(profile){
	if (!currentUser) return;
	const key = profileKey();
	localStorage.setItem(key, JSON.stringify(profile));
	views.profileStatus.textContent = 'Saved';
	setTimeout(()=> views.profileStatus.textContent = '', 2500);
}

function loadProfile(){
	if (!currentUser) return;
	const raw = localStorage.getItem(profileKey());
	if (!raw) return;
	try {
		const p = JSON.parse(raw);
		document.getElementById('pf-first').value = p.first || '';
		document.getElementById('pf-last').value = p.last || '';
		document.getElementById('pf-phone').value = p.phone || '';
		document.getElementById('pf-district').value = p.district || '';
		document.getElementById('pf-state').value = p.state || '';
		document.getElementById('pf-crop').value = p.crop || '';
		document.getElementById('pf-notes').value = p.notes || '';
	} catch(e){ console.warn('Profile parse failed', e); }
}

function profileKey(){ return 'profile:' + (currentUser?.uid || 'anon'); }

function renderServices(){
	views.servicesList.innerHTML='';
	const term = views.serviceSearch.value.trim().toLowerCase();
	const cat = views.serviceCategory.value;
	const list = servicesData.filter(s =>
		(cat==='all' || s.cat===cat) &&
		(!term || s.title.toLowerCase().includes(term) || s.short.toLowerCase().includes(term))
	);
	if (!list.length){
		views.servicesList.innerHTML = '<p style="font-size:.7rem;opacity:.7;">No services match.</p>';
		return;
	}
	const tpl = document.getElementById('serviceCardTpl');
	list.forEach(svc => {
		const clone = tpl.content.cloneNode(true);
		const card = clone.querySelector('.service-card');
		card.dataset.id = svc.id;
		card.querySelector('.svc-title').textContent = svc.title;
		card.querySelector('.svc-desc').textContent = svc.short;
		card.querySelector('.tag').textContent = svc.cat;
		const details = card.querySelector('.svc-details');
		details.textContent = svc.details;
		card.querySelector('.more-btn').addEventListener('click', () => {
			details.classList.toggle('hidden');
		});
		views.servicesList.appendChild(clone);
	});
}

function collectFeedback(){
	const category = document.getElementById('fb-category').value;
	const subject = document.getElementById('fb-subject').value.trim();
	const msg = document.getElementById('fb-message').value.trim();
	const urgency = document.getElementById('fb-urgency').value;
	if (!category || !subject || !msg) {
		views.feedbackStatus.textContent = 'Please fill all required fields';
		return null;
	}
	return { id: crypto.randomUUID(), category, subject, msg, urgency, ts: Date.now() };
}

function saveFeedback(item){
	if (!currentUser) return;
	const key = feedbackKey();
	const list = loadFeedbackRaw();
	list.unshift(item);
	localStorage.setItem(key, JSON.stringify(list.slice(0, 200)));
	views.feedbackStatus.textContent = 'Submitted';
	setTimeout(()=> views.feedbackStatus.textContent = '', 2000);
	views.fbForm.reset();
	loadFeedback();
}

function loadFeedback(){
	const list = loadFeedbackRaw();
	views.feedbackList.innerHTML = '';
	if (!list.length){
		views.feedbackList.innerHTML = '<p style="font-size:.65rem;opacity:.6;">No feedback yet.</p>';
		return;
	}
	const tpl = document.getElementById('feedbackItemTpl');
	list.forEach(item => {
		const clone = tpl.content.cloneNode(true);
		clone.querySelector('.cat').textContent = item.category;
		clone.querySelector('.subject').textContent = item.subject;
		clone.querySelector('.msg').textContent = item.msg;
		const time = clone.querySelector('.time');
		time.dateTime = new Date(item.ts).toISOString();
		time.textContent = new Date(item.ts).toLocaleString();
		const urg = clone.querySelector('.urgency');
		urg.textContent = item.urgency;
		urg.dataset.u = item.urgency;
		views.feedbackList.appendChild(clone);
	});
}

function loadFeedbackRaw(){
	if (!currentUser) return [];
	try { return JSON.parse(localStorage.getItem(feedbackKey())||'[]'); } catch(e){ return []; }
}

function feedbackKey(){ return 'feedback:' + (currentUser?.uid || 'anon'); }

// Expose minimal debug (optional)
window.FarmerApp = { renderServices, loadFeedback };

