import logo from '../assets/apms-logo.svg';
export default function BrandLogo() {
    return <span className="apms-brand-image">
        <svg className="brand-filter-defs" aria-hidden="true" focusable="false">
            <filter id="apms-sidebar-cutout" colorInterpolationFilters="sRGB">
                <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.95 0 0 0 0 0.89 0 0 0 0 1 -4 0 0 0 3.9" />
            </filter>
        </svg>
        <img src={logo} alt="APMS" />
    </span>;
}
